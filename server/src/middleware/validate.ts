import { NextFunction, ParamsDictionary, Request, RequestHandler, Response } from 'express-serve-static-core';
import { ParsedQs } from 'qs';
import { ZodError, ZodType } from 'zod';
import { ApiError } from '../utils/ApiError';

interface ValidationSchemas<P, ReqQuery, ReqBody> {
  params?: ZodType<P>;
  query?: ZodType<ReqQuery>;
  body?: ZodType<ReqBody>;
}

function formatZodError(error: ZodError) {
  return error.errors.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message
  }));
}

// Express 5 exposes req.query as a getter-only accessor (there's no setter),
// so a plain `req.query = ...` throws at runtime in strict mode. Redefining
// the property on the request instance shadows the prototype accessor with
// a regular writable one.
function setQuery(req: Request<any, any, any, any>, value: unknown) {
  Object.defineProperty(req, 'query', {
    value,
    writable: true,
    configurable: true,
    enumerable: true
  });
}

// Validates params/query/body against the given zod schemas and replaces
// each with its parsed (and, for query, type-coerced) result, so downstream
// handlers work with already-validated data instead of re-checking it.
//
// Typed the same way asyncHandler is — passing the schemas lets TypeScript
// infer P/ReqQuery/ReqBody from them via z.infer, so the route's asyncHandler
// generics and this middleware's output agree on the request shape.
export function validate<
  P = ParamsDictionary,
  ReqQuery = ParsedQs,
  ReqBody = any
>({ params, query, body }: ValidationSchemas<P, ReqQuery, ReqBody>): RequestHandler<P, any, ReqBody, ReqQuery> {
  return (req, _res: Response, next: NextFunction) => {
    try {
      if (params) {
        req.params = params.parse(req.params);
      }
      if (query) {
        setQuery(req, query.parse(req.query));
      }
      if (body) {
        req.body = body.parse(req.body);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new ApiError(400, 'VALIDATION_ERROR', 'Validation failed', formatZodError(error)));
        return;
      }
      next(error);
    }
  };
}