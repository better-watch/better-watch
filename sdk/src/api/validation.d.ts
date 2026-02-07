/**
 * Validation logic for trace ingestion API
 */
import type { TraceBatchRequest, ValidationError } from './types.js';
/**
 * Validate a single trace event
 */
export declare function validateTraceEvent(trace: unknown): ValidationError[];
/**
 * Validate a batch request
 */
export declare function validateBatchRequest(request: unknown): ValidationError[];
/**
 * Validate all traces in a batch request and collect errors
 */
export declare function validateTracesInBatch(request: TraceBatchRequest): Array<{
    index: number;
    errors: ValidationError[];
}>;
//# sourceMappingURL=validation.d.ts.map