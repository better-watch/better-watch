import { z } from 'zod';

/**
 * Data Service with Processing Operations
 *
 * Provides data management operations with in-memory mock storage.
 * Implements CRUD operations for data records with processing capabilities.
 *
 * Features:
 * - Type-safe data validation using Zod schemas
 * - In-memory storage for development and testing
 * - Singleton pattern for consistent state throughout the application
 * - Standard CRUD operations: Create, Read, Update, Delete
 * - Processing operations: transform, filter, aggregate, validate
 * - Search and listing capabilities
 */

// Data validation schema
const DataSchema = z.object({
  id: z.string().min(1, 'Data ID is required'),
  name: z.string().min(1, 'Data name is required'),
  value: z.unknown().describe('Raw data value'),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).default('pending'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Data creation schema (excludes auto-generated fields)
const CreateDataSchema = DataSchema.omit({
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
});

// Data update schema (all fields optional)
const UpdateDataSchema = CreateDataSchema.partial().omit({ value: true });

export type Data = z.infer<typeof DataSchema>;
export type CreateDataInput = z.infer<typeof CreateDataSchema>;
export type UpdateDataInput = z.infer<typeof UpdateDataSchema>;

/**
 * Data Service implementation with mock storage and processing operations
 * Provides CRUD operations, transformations, and data processing utilities
 */
class DataService {
  private storage: Map<string, Data> = new Map();
  private idCounter = 0;

  /**
   * Generate a unique data ID
   * @returns Unique data ID string
   */
  private generateId(): string {
    return `data_${++this.idCounter}`;
  }

  /**
   * Create a new data record
   * @param input - Data creation input
   * @returns Created data object
   * @throws {z.ZodError} If input validation fails
   */
  createData(input: CreateDataInput): Data {
    // Validate input
    const validatedInput = CreateDataSchema.parse(input);

    const now = new Date();
    const data: Data = {
      id: this.generateId(),
      ...validatedInput,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    // Store data
    this.storage.set(data.id, data);

    return data;
  }

  /**
   * Get a data record by ID
   * @param id - Data ID
   * @returns Data object or undefined if not found
   */
  getData(id: string): Data | undefined {
    return this.storage.get(id);
  }

  /**
   * Get all data records
   * @returns Array of all data records
   */
  getAllData(): Data[] {
    return Array.from(this.storage.values());
  }

  /**
   * Find data records by name
   * @param name - Name to search for
   * @returns Array of data records with matching name
   */
  getDataByName(name: string): Data[] {
    return Array.from(this.storage.values()).filter((data) => data.name === name);
  }

  /**
   * Find data records by status
   * @param status - Status to filter by
   * @returns Array of data records with matching status
   */
  getDataByStatus(status: Data['status']): Data[] {
    return Array.from(this.storage.values()).filter((data) => data.status === status);
  }

  /**
   * Update a data record
   * @param id - Data ID
   * @param input - Partial data update
   * @returns Updated data object
   * @throws {z.ZodError} If input validation fails
   * @throws {Error} If data not found
   */
  updateData(id: string, input: UpdateDataInput): Data {
    const data = this.getData(id);
    if (!data) {
      throw new Error(`Data not found: ${id}`);
    }

    // Validate input
    const validatedInput = UpdateDataSchema.parse(input);

    // Update data
    const updatedData: Data = {
      ...data,
      ...validatedInput,
      updatedAt: new Date(),
    };

    this.storage.set(id, updatedData);

    return updatedData;
  }

  /**
   * Delete a data record
   * @param id - Data ID
   * @returns true if data was deleted, false if not found
   */
  deleteData(id: string): boolean {
    return this.storage.delete(id);
  }

  /**
   * Clear all data records from storage
   * Useful for testing and resetting state
   */
  clear(): void {
    this.storage.clear();
    this.idCounter = 0;
  }

  /**
   * Get data record count
   * @returns Number of data records in storage
   */
  count(): number {
    return this.storage.size;
  }

  /**
   * Process a data record - transitions status from pending to processing
   * @param id - Data ID
   * @returns Updated data object
   * @throws {Error} If data not found
   */
  processData(id: string): Data {
    return this.updateData(id, { status: 'processing' });
  }

  /**
   * Complete processing of a data record
   * @param id - Data ID
   * @returns Updated data object
   * @throws {Error} If data not found
   */
  completeData(id: string): Data {
    return this.updateData(id, { status: 'completed' });
  }

  /**
   * Mark a data record as failed
   * @param id - Data ID
   * @returns Updated data object
   * @throws {Error} If data not found
   */
  failData(id: string): Data {
    return this.updateData(id, { status: 'failed' });
  }

  /**
   * Transform data records using a mapping function
   * @param ids - Array of data IDs to transform
   * @param transformer - Function to transform data values
   * @returns Array of transformed data records
   */
  transformData(ids: string[], transformer: (value: unknown) => unknown): Data[] {
    return ids
      .map((id) => {
        const data = this.getData(id);
        if (!data) return null;

        const transformed: Data = {
          ...data,
          value: transformer(data.value),
          updatedAt: new Date(),
        };

        this.storage.set(id, transformed);
        return transformed;
      })
      .filter((data): data is Data => data !== null);
  }

  /**
   * Filter data records based on a predicate function
   * @param predicate - Function to filter data records
   * @returns Array of filtered data records
   */
  filterData(predicate: (data: Data) => boolean): Data[] {
    return Array.from(this.storage.values()).filter(predicate);
  }

  /**
   * Aggregate data records into a single result
   * @param aggregator - Function to aggregate data records
   * @param initialValue - Initial value for aggregation
   * @returns Aggregated result
   */
  aggregateData<T>(aggregator: (acc: T, data: Data) => T, initialValue: T): T {
    return Array.from(this.storage.values()).reduce(aggregator, initialValue);
  }

  /**
   * Validate data records and return validation results
   * @param ids - Array of data IDs to validate
   * @param validator - Function to validate data records
   * @returns Object with valid and invalid data records
   */
  validateData(ids: string[], validator: (data: Data) => boolean): { valid: Data[]; invalid: Data[] } {
    const valid: Data[] = [];
    const invalid: Data[] = [];

    ids.forEach((id) => {
      const data = this.getData(id);
      if (data) {
        if (validator(data)) {
          valid.push(data);
        } else {
          invalid.push(data);
        }
      }
    });

    return { valid, invalid };
  }
}

/**
 * Export singleton instance of Data Service
 * This ensures consistent state throughout the application
 */
export const dataService = new DataService();

export default dataService;
