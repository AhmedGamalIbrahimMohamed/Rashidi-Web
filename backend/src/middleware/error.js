import multer from 'multer';
import { Prisma } from '@prisma/client';
import { env } from '../config/env.js';
import { ApiError } from '../utils/errors.js';

export function notFoundHandler(req, _res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} does not exist`));
}

/** Maps framework and ORM errors onto stable, non-leaky API responses. */
// eslint-disable-next-line no-unused-vars -- Express identifies error middleware by arity.
export function errorHandler(error, req, res, _next) {
  let status = error.status || 500;
  let message = error.message || 'Something went wrong';
  const details = error.details;

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      status = 413;
      message = `File exceeds the ${env.uploads.maxFileSizeMb}MB limit`;
    } else if (error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE') {
      status = 400;
      message = `Upload at most ${env.uploads.maxFilesPerRequest} files at a time`;
    } else {
      status = 400;
    }
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      status = 409;
      const target = error.meta?.target;
      const field = Array.isArray(target) ? target.join(', ') : target;
      message = `A record with this ${field || 'value'} already exists`;
    } else if (error.code === 'P2025') {
      status = 404;
      message = 'Resource not found';
    } else if (error.code === 'P2003') {
      status = 409;
      message = 'This record is still referenced by other data';
    } else {
      status = 400;
      message = 'Database request could not be completed';
    }
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    status = 400;
    message = 'Invalid data sent to the database';
  } else if (error instanceof SyntaxError && 'body' in error) {
    status = 400;
    message = 'Request body is not valid JSON';
  }

  if (status >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl}`, error);
    if (env.isProduction) message = 'Something went wrong';
  }

  res.status(status).json({
    success: false,
    error: { message, ...(details ? { details } : {}) },
  });
}
