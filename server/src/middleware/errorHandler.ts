import { ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';

// Centralized error handler. Route handlers no longer need their own
// try/catch → console.error → res.status(500).json(...) boilerplate;
// asyncHandler forwards rejected promises here.
//
// Prisma's "record not found" error (P2025) is thrown by update/delete
// calls targeting a missing row, so it's mapped to 404 here instead of
// falling through to a generic 500 (e.g. PUT /restaurants/:id previously
// returned 500 for a missing restaurant instead of 404).
export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  console.error(`Error handling ${req.method} ${req.originalUrl}:`, error);

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Not found' });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'A record with these values already exists' });
    }
  }

  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? (error as Error)?.message : undefined
  });
};
