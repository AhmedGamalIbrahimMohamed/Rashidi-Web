/** Error carrying an HTTP status so the error middleware can answer correctly. */
export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    if (details) this.details = details;
  }

  static badRequest(message = 'Bad request', details) {
    return new ApiError(400, message, details);
  }
  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, message);
  }
  static forbidden(message = 'You do not have access to this resource') {
    return new ApiError(403, message);
  }
  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }
  static conflict(message = 'Resource already exists', details) {
    return new ApiError(409, message, details);
  }
  static payloadTooLarge(message = 'File is too large') {
    return new ApiError(413, message);
  }
  static unsupportedMedia(message = 'Unsupported file type') {
    return new ApiError(415, message);
  }
  static tooManyRequests(message = 'Too many requests, please try again later') {
    return new ApiError(429, message);
  }
  static internal(message = 'Something went wrong') {
    return new ApiError(500, message);
  }
}

/**
 * Wraps an async route handler so a rejected promise reaches Express'
 * error pipeline instead of hanging the request.
 */
export const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
