/**
 * Validation logic for trace ingestion API
 */
/**
 * Validate a single trace event
 */
export function validateTraceEvent(trace) {
    const errors = [];
    if (!trace || typeof trace !== 'object') {
        errors.push({
            field: 'trace',
            message: 'Trace must be an object',
        });
        return errors;
    }
    const t = trace;
    if (!t.id || typeof t.id !== 'string') {
        errors.push({
            field: 'id',
            message: 'Trace ID must be a non-empty string',
            rule: 'required|string',
        });
    }
    if (!t.projectId || typeof t.projectId !== 'string') {
        errors.push({
            field: 'projectId',
            message: 'Project ID must be a non-empty string',
            rule: 'required|string',
        });
    }
    if (!t.filePath || typeof t.filePath !== 'string') {
        errors.push({
            field: 'filePath',
            message: 'File path must be a non-empty string',
            rule: 'required|string',
        });
    }
    if (typeof t.lineNumber !== 'number' || t.lineNumber < 1) {
        errors.push({
            field: 'lineNumber',
            message: 'Line number must be a positive integer',
            rule: 'required|number|min:1',
        });
    }
    if (t.columnNumber !== undefined) {
        if (typeof t.columnNumber !== 'number' || t.columnNumber < 0) {
            errors.push({
                field: 'columnNumber',
                message: 'Column number must be a non-negative integer',
                rule: 'number|min:0',
            });
        }
    }
    if (!t.type ||
        !['before', 'after', 'entry', 'exit'].includes(t.type)) {
        errors.push({
            field: 'type',
            message: 'Type must be one of: before, after, entry, exit',
            rule: 'required|in:before,after,entry,exit',
        });
    }
    if (!t.timestamp || typeof t.timestamp !== 'string') {
        errors.push({
            field: 'timestamp',
            message: 'Timestamp must be a valid ISO 8601 string',
            rule: 'required|datetime',
        });
    }
    else {
        // Validate ISO 8601 format
        const date = new Date(t.timestamp);
        if (isNaN(date.getTime())) {
            errors.push({
                field: 'timestamp',
                message: 'Timestamp must be a valid ISO 8601 string',
                rule: 'datetime',
            });
        }
    }
    if (t.functionName !== undefined &&
        typeof t.functionName !== 'string') {
        errors.push({
            field: 'functionName',
            message: 'Function name must be a string',
            rule: 'string',
        });
    }
    if (t.sessionId !== undefined &&
        typeof t.sessionId !== 'string') {
        errors.push({
            field: 'sessionId',
            message: 'Session ID must be a string',
            rule: 'string',
        });
    }
    if (t.stackTrace !== undefined &&
        typeof t.stackTrace !== 'string') {
        errors.push({
            field: 'stackTrace',
            message: 'Stack trace must be a string',
            rule: 'string',
        });
    }
    return errors;
}
/**
 * Validate a batch request
 */
export function validateBatchRequest(request) {
    const errors = [];
    if (!request || typeof request !== 'object') {
        errors.push({
            field: 'request',
            message: 'Request must be an object',
        });
        return errors;
    }
    const req = request;
    if (!req.apiKey || typeof req.apiKey !== 'string') {
        errors.push({
            field: 'apiKey',
            message: 'API key must be a non-empty string',
            rule: 'required|string',
        });
    }
    if (!req.projectId || typeof req.projectId !== 'string') {
        errors.push({
            field: 'projectId',
            message: 'Project ID must be a non-empty string',
            rule: 'required|string',
        });
    }
    if (!Array.isArray(req.traces)) {
        errors.push({
            field: 'traces',
            message: 'Traces must be an array',
            rule: 'required|array',
        });
        return errors;
    }
    if (req.traces.length === 0) {
        errors.push({
            field: 'traces',
            message: 'Traces array must not be empty',
            rule: 'required|min:1',
        });
    }
    if (req.clientVersion !== undefined) {
        if (typeof req.clientVersion !== 'string') {
            errors.push({
                field: 'clientVersion',
                message: 'Client version must be a string',
                rule: 'string',
            });
        }
    }
    return errors;
}
/**
 * Validate all traces in a batch request and collect errors
 */
export function validateTracesInBatch(request) {
    const results = [];
    request.traces.forEach((trace, index) => {
        const errors = validateTraceEvent(trace);
        if (errors.length > 0) {
            results.push({ index, errors });
        }
    });
    return results;
}
//# sourceMappingURL=validation.js.map