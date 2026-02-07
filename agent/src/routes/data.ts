import { Hono } from 'hono';
import { Context } from 'hono';
import { z } from 'zod';
import { dataService, type CreateDataInput, type UpdateDataInput } from '../services/data';

/**
 * Data Processing Routes with Validation
 *
 * Provides comprehensive REST API endpoints for data management and processing:
 * - POST /data - Create a new data record (with validation)
 * - GET /data - List all data records
 * - GET /data/:id - Get a specific data record
 * - PUT /data/:id - Update a data record (with validation)
 * - DELETE /data/:id - Delete a data record
 * - POST /data/:id/process - Start processing a data record
 * - POST /data/:id/complete - Mark processing as completed
 * - POST /data/:id/fail - Mark processing as failed
 * - GET /data/status/:status - Get data records by status
 *
 * All endpoints include:
 * - Input validation using Zod schemas
 * - Error handling for invalid requests
 * - Proper HTTP status codes
 * - JSON request/response bodies
 */

// Validation schemas for request bodies
const CreateDataRequestSchema = z.object({
  name: z.string().min(1, 'Data name is required').max(255, 'Data name must be less than 255 characters'),
  value: z.unknown().describe('Raw data value'),
});

const UpdateDataRequestSchema = z.object({
  name: z.string().min(1, 'Data name is required').max(255, 'Data name must be less than 255 characters').optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
});

export function createDataRoutes(): Hono {
  const routes = new Hono();

  /**
   * Create Data Record
   * POST /data
   *
   * Request body:
   * {
   *   "name": "string",
   *   "value": "any"
   * }
   *
   * Response: 201 Created with created data object
   * Error: 400 Bad Request if validation fails
   */
  routes.post('/', async (c: Context) => {
    try {
      const body = await c.req.json();

      // Validate request body
      const validatedInput = CreateDataRequestSchema.parse(body);

      // Create data using service
      const data = dataService.createData(validatedInput as CreateDataInput);

      return c.json(data, 201);
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
          error: 'Failed to create data',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      );
    }
  });

  /**
   * List All Data Records
   * GET /data
   *
   * Response: 200 OK with array of data records
   */
  routes.get('/', (c: Context) => {
    const data = dataService.getAllData();
    return c.json(
      {
        data,
        count: data.length,
      },
      200
    );
  });

  /**
   * Get Data Record by ID
   * GET /data/:id
   *
   * Response: 200 OK with data object
   * Error: 404 Not Found if data doesn't exist
   */
  routes.get('/:id', (c: Context) => {
    const id = c.req.param('id');
    const data = dataService.getData(id);

    if (!data) {
      return c.json(
        {
          error: 'Not found',
          message: `Data with ID "${id}" not found`,
        },
        404
      );
    }

    return c.json(data, 200);
  });

  /**
   * Get Data Records by Status
   * GET /data/status/:status
   *
   * Query parameters:
   * - status: one of 'pending', 'processing', 'completed', 'failed'
   *
   * Response: 200 OK with array of data records matching the status
   * Error: 400 Bad Request if status is invalid
   */
  routes.get('/status/:status', (c: Context) => {
    try {
      const status = c.req.param('status');

      // Validate status value
      const validStatus = z.enum(['pending', 'processing', 'completed', 'failed']).parse(status);

      const data = dataService.getDataByStatus(validStatus);
      return c.json(
        {
          status: validStatus,
          data,
          count: data.length,
        },
        200
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json(
          {
            error: 'Invalid status',
            message: 'Status must be one of: pending, processing, completed, failed',
          },
          400
        );
      }

      return c.json(
        {
          error: 'Failed to retrieve data',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      );
    }
  });

  /**
   * Update Data Record
   * PUT /data/:id
   *
   * Request body (partial):
   * {
   *   "name": "string (optional)",
   *   "status": "string (optional, one of: pending, processing, completed, failed)"
   * }
   *
   * Response: 200 OK with updated data object
   * Error: 404 Not Found if data doesn't exist
   * Error: 400 Bad Request if validation fails
   */
  routes.put('/:id', async (c: Context) => {
    try {
      const id = c.req.param('id');
      const body = await c.req.json();

      // Check if data exists
      const data = dataService.getData(id);
      if (!data) {
        return c.json(
          {
            error: 'Not found',
            message: `Data with ID "${id}" not found`,
          },
          404
        );
      }

      // Validate request body
      const validatedInput = UpdateDataRequestSchema.parse(body);

      // Update data using service
      const updatedData = dataService.updateData(id, validatedInput as UpdateDataInput);

      return c.json(updatedData, 200);
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
          error: 'Failed to update data',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      );
    }
  });

  /**
   * Delete Data Record
   * DELETE /data/:id
   *
   * Response: 204 No Content if successful
   * Error: 404 Not Found if data doesn't exist
   */
  routes.delete('/:id', (c: Context) => {
    const id = c.req.param('id');
    const deleted = dataService.deleteData(id);

    if (!deleted) {
      return c.json(
        {
          error: 'Not found',
          message: `Data with ID "${id}" not found`,
        },
        404
      );
    }

    return c.body(null, 204);
  });

  /**
   * Process Data Record
   * POST /data/:id/process
   *
   * Transitions a data record from 'pending' to 'processing' status.
   *
   * Response: 200 OK with updated data object
   * Error: 404 Not Found if data doesn't exist
   */
  routes.post('/:id/process', (c: Context) => {
    try {
      const id = c.req.param('id');

      // Process data using service
      const data = dataService.processData(id);

      return c.json(data, 200);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return c.json(
          {
            error: 'Not found',
            message: error.message,
          },
          404
        );
      }

      return c.json(
        {
          error: 'Failed to process data',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      );
    }
  });

  /**
   * Complete Data Processing
   * POST /data/:id/complete
   *
   * Transitions a data record to 'completed' status.
   *
   * Response: 200 OK with updated data object
   * Error: 404 Not Found if data doesn't exist
   */
  routes.post('/:id/complete', (c: Context) => {
    try {
      const id = c.req.param('id');

      // Complete data using service
      const data = dataService.completeData(id);

      return c.json(data, 200);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return c.json(
          {
            error: 'Not found',
            message: error.message,
          },
          404
        );
      }

      return c.json(
        {
          error: 'Failed to complete data processing',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      );
    }
  });

  /**
   * Fail Data Processing
   * POST /data/:id/fail
   *
   * Transitions a data record to 'failed' status.
   *
   * Response: 200 OK with updated data object
   * Error: 404 Not Found if data doesn't exist
   */
  routes.post('/:id/fail', (c: Context) => {
    try {
      const id = c.req.param('id');

      // Fail data using service
      const data = dataService.failData(id);

      return c.json(data, 200);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return c.json(
          {
            error: 'Not found',
            message: error.message,
          },
          404
        );
      }

      return c.json(
        {
          error: 'Failed to mark data as failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      );
    }
  });

  return routes;
}

export default createDataRoutes;
