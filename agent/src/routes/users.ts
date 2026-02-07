import { Hono } from 'hono';
import { Context } from 'hono';
import { z } from 'zod';
import { userService, type CreateUserInput, type UpdateUserInput } from '../services/user';

/**
 * User Management Routes with Validation
 *
 * Provides comprehensive REST API endpoints for user management:
 * - POST /users - Create a new user (with validation)
 * - GET /users - List all users
 * - GET /users/:id - Get a specific user
 * - PUT /users/:id - Update a user (with validation)
 * - DELETE /users/:id - Delete a user
 *
 * All endpoints include:
 * - Input validation using Zod schemas
 * - Error handling for invalid requests
 * - Proper HTTP status codes
 * - JSON request/response bodies
 */

// Validation schemas for request bodies
const CreateUserRequestSchema = z.object({
  name: z.string().min(1, 'User name is required').max(255, 'User name must be less than 255 characters'),
  email: z.string().email('Invalid email format'),
});

const UpdateUserRequestSchema = z.object({
  name: z.string().min(1, 'User name is required').max(255, 'User name must be less than 255 characters').optional(),
  email: z.string().email('Invalid email format').optional(),
});

export function createUserRoutes(): Hono {
  const routes = new Hono();

  /**
   * Create User
   * POST /users
   *
   * Request body:
   * {
   *   "name": "string",
   *   "email": "string"
   * }
   *
   * Response: 201 Created with created user object
   * Error: 400 Bad Request if validation fails
   */
  routes.post('/', async (c: Context) => {
    try {
      const body = await c.req.json();

      // Validate request body
      const validatedInput = CreateUserRequestSchema.parse(body);

      // Create user using service
      const user = userService.createUser(validatedInput as CreateUserInput);

      return c.json(user, 201);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json(
          {
            error: 'Validation error',
            details: error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
          400
        );
      }

      return c.json(
        {
          error: 'Failed to create user',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      );
    }
  });

  /**
   * List All Users
   * GET /users
   *
   * Response: 200 OK with array of users
   */
  routes.get('/', (c: Context) => {
    const users = userService.getAllUsers();
    return c.json(
      {
        users,
        count: users.length,
      },
      200
    );
  });

  /**
   * Get User by ID
   * GET /users/:id
   *
   * Response: 200 OK with user object
   * Error: 404 Not Found if user doesn't exist
   */
  routes.get('/:id', (c: Context) => {
    const id = c.req.param('id');
    const user = userService.getUser(id);

    if (!user) {
      return c.json(
        {
          error: 'Not found',
          message: `User with ID "${id}" not found`,
        },
        404
      );
    }

    return c.json(user, 200);
  });

  /**
   * Update User
   * PUT /users/:id
   *
   * Request body (partial):
   * {
   *   "name": "string (optional)",
   *   "email": "string (optional)"
   * }
   *
   * Response: 200 OK with updated user object
   * Error: 404 Not Found if user doesn't exist
   * Error: 400 Bad Request if validation fails
   */
  routes.put('/:id', async (c: Context) => {
    try {
      const id = c.req.param('id');
      const body = await c.req.json();

      // Check if user exists
      const user = userService.getUser(id);
      if (!user) {
        return c.json(
          {
            error: 'Not found',
            message: `User with ID "${id}" not found`,
          },
          404
        );
      }

      // Validate request body
      const validatedInput = UpdateUserRequestSchema.parse(body);

      // Update user using service
      const updatedUser = userService.updateUser(id, validatedInput as UpdateUserInput);

      return c.json(updatedUser, 200);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json(
          {
            error: 'Validation error',
            details: error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
          400
        );
      }

      return c.json(
        {
          error: 'Failed to update user',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      );
    }
  });

  /**
   * Delete User
   * DELETE /users/:id
   *
   * Response: 204 No Content if successful
   * Error: 404 Not Found if user doesn't exist
   */
  routes.delete('/:id', (c: Context) => {
    const id = c.req.param('id');
    const deleted = userService.deleteUser(id);

    if (!deleted) {
      return c.json(
        {
          error: 'Not found',
          message: `User with ID "${id}" not found`,
        },
        404
      );
    }

    return c.body(null, 204);
  });

  return routes;
}

export default createUserRoutes;
