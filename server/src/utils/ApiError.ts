// Thrown from route handlers to report a request-level failure. asyncHandler
// forwards it to errorHandler, which is the single place response shape is
// decided — every failure ends up as { error: { message, code, details? } }
// instead of each route hand-rolling its own JSON body.
export type ErrorCode = 'VALIDATION_ERROR' | 'NOT_FOUND' | 'CONFLICT' | 'INTERNAL_ERROR';

export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details?: unknown;

  constructor(status: number, code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}