import { NextFunction, ParamsDictionary, Request, RequestHandler, Response } from 'express-serve-static-core';
import { ParsedQs } from 'qs';

// Wraps an async route handler so a rejected promise is forwarded to
// Express's error-handling middleware instead of crashing the process
// or requiring a repeated try/catch in every handler.
//
// Generic over the same params Express's RequestHandler is: passing the
// route's param type explicitly (e.g. asyncHandler<{ id: string }>(...))
// keeps req.params narrowed instead of widening to Express's default
// ParamsDictionary (`string | string[]`).
export const asyncHandler = <
  P = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = ParsedQs,
  Locals extends Record<string, any> = Record<string, any>
>(
  handler: (
    req: Request<P, ResBody, ReqBody, ReqQuery, Locals>,
    res: Response<ResBody, Locals>,
    next: NextFunction
  ) => Promise<unknown>
): RequestHandler<P, ResBody, ReqBody, ReqQuery, Locals> => {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
};
