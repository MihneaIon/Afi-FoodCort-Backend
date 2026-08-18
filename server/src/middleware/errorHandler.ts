import { ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ApiError, ErrorCode } from '../utils/ApiError';

// Centralized error handler. Route handlers no longer need their own
// try/catch → console.error → res.status(500).json(...) boilerplate;
// asyncHandler forwards rejected promises here. This is also the single
// place the error response shape is decided, so every failure — validation,
// not-found, Prisma, or unexpected — comes back as
// { error: { message, code, details? } } instead of each route inventing
// its own body.
//
// Prisma's "record not found" error (P2025) is thrown by update/delete
// calls targeting a missing row, so it's mapped to 404 here instead of
// falling through to a generic 500 (e.g. PUT /restaurants/:id previously
// returned 500 for a missing restaurant instead of 404).
function sendError(res: Parameters<ErrorRequestHandler>[2], status: number, code: ErrorCode, message: string, details?: unknown) {
  res.status(status).json({
    error: {
      message,
      code,
      ...(details !== undefined ? { details } : {})
    }
  });
}

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  console.error(`Error handling ${req.method} ${req.originalUrl}:`, error);

  if (error instanceof ApiError) {
    return sendError(res, error.status, error.code, error.message, error.details);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2025') {
      return sendError(res, 404, 'NOT_FOUND', 'Not found');
    }
    if (error.code === 'P2002') {
      return sendError(res, 409, 'CONFLICT', 'A record with these values already exists');
    }
  }

  sendError(
    res,
    500,
    'INTERNAL_ERROR',
    'Internal server error',
    process.env.NODE_ENV === 'development' ? (error as Error)?.message : undefined
  );
};
