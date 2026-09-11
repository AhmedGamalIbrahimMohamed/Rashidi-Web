import { ZodError } from 'zod';
import { ApiError } from '../utils/errors.js';

/**
 * Validates a request segment and replaces it with the parsed result, so
 * controllers always receive coerced, trimmed, known-shaped data.
 *
 * Query strings are written to `req.validatedQuery` instead of `req.query`
 * because some Express versions expose the latter through a getter.
 */
export const validate =
  (schema, source = 'body') =>
  (req, _res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      if (source === 'query') {
        req.validatedQuery = parsed;
      } else {
        req[source] = parsed;
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map((issue) => ({
          field: issue.path.join('.') || source,
          message: issue.message,
        }));
        return next(ApiError.badRequest('Validation failed', details));
      }
      return next(error);
    }
  };
