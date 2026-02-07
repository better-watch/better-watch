import { z } from 'zod';

/**
 * User Service with Mock Storage
 *
 * Provides user management operations with in-memory mock storage.
 * Implements CRUD operations for user entities with type-safe validation.
 *
 * Features:
 * - Type-safe user data validation using Zod schemas
 * - In-memory storage for development and testing
 * - Singleton pattern for consistent state throughout the application
 * - Standard CRUD operations: Create, Read, Update, Delete
 * - Search and listing capabilities
 */

// User validation schema
const UserSchema = z.object({
  id: z.string().min(1, 'User ID is required'),
  name: z.string().min(1, 'User name is required'),
  email: z.string().email('Invalid email format'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// User creation schema (excludes auto-generated fields)
const CreateUserSchema = UserSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// User update schema (all fields optional)
const UpdateUserSchema = CreateUserSchema.partial();

export type User = z.infer<typeof UserSchema>;
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

/**
 * User Service implementation with mock storage
 * Provides CRUD operations and utilities for user management
 */
class UserService {
  private storage: Map<string, User> = new Map();
  private idCounter = 0;

  /**
   * Generate a unique user ID
   * @returns Unique user ID string
   */
  private generateId(): string {
    return `user_${++this.idCounter}`;
  }

  /**
   * Create a new user
   * @param input - User creation input
   * @returns Created user object
   * @throws {z.ZodError} If input validation fails
   */
  createUser(input: CreateUserInput): User {
    // Validate input
    const validatedInput = CreateUserSchema.parse(input);

    const now = new Date();
    const user: User = {
      id: this.generateId(),
      ...validatedInput,
      createdAt: now,
      updatedAt: now,
    };

    // Store user
    this.storage.set(user.id, user);

    return user;
  }

  /**
   * Get a user by ID
   * @param id - User ID
   * @returns User object or undefined if not found
   */
  getUser(id: string): User | undefined {
    return this.storage.get(id);
  }

  /**
   * Get all users
   * @returns Array of all users
   */
  getAllUsers(): User[] {
    return Array.from(this.storage.values());
  }

  /**
   * Find users by email
   * @param email - Email address to search for
   * @returns Array of users with matching email
   */
  getUsersByEmail(email: string): User[] {
    return Array.from(this.storage.values()).filter((user) => user.email === email);
  }

  /**
   * Update a user
   * @param id - User ID
   * @param input - Partial user update
   * @returns Updated user object
   * @throws {z.ZodError} If input validation fails
   * @throws {Error} If user not found
   */
  updateUser(id: string, input: UpdateUserInput): User {
    const user = this.getUser(id);
    if (!user) {
      throw new Error(`User not found: ${id}`);
    }

    // Validate input
    const validatedInput = UpdateUserSchema.parse(input);

    // Update user
    const updatedUser: User = {
      ...user,
      ...validatedInput,
      updatedAt: new Date(),
    };

    this.storage.set(id, updatedUser);

    return updatedUser;
  }

  /**
   * Delete a user
   * @param id - User ID
   * @returns true if user was deleted, false if not found
   */
  deleteUser(id: string): boolean {
    return this.storage.delete(id);
  }

  /**
   * Clear all users from storage
   * Useful for testing and resetting state
   */
  clear(): void {
    this.storage.clear();
    this.idCounter = 0;
  }

  /**
   * Get user count
   * @returns Number of users in storage
   */
  count(): number {
    return this.storage.size;
  }
}

/**
 * Export singleton instance of User Service
 * This ensures consistent state throughout the application
 */
export const userService = new UserService();

export default userService;
