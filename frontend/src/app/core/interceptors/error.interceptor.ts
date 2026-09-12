import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { ApiFailure } from '../models/api.model';

/**
 * Normalises every transport failure into an {@link ApiFailure}, so components
 * can render `failure.message` without unpacking HttpErrorResponse bodies or
 * guarding against network errors that carry no body at all.
 */
export const errorInterceptor: HttpInterceptorFn = (request, next) =>
  next(request).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(
          () => ({ status: 0, message: 'Unexpected error' }) satisfies ApiFailure,
        );
      }

      // status 0 means the request never reached the server.
      if (error.status === 0) {
        return throwError(
          () =>
            ({
              status: 0,
              message: 'Cannot reach the server. Check your connection and try again.',
            }) satisfies ApiFailure,
        );
      }

      const body = error.error as
        | { error?: { message?: string; details?: ApiFailure['details'] } }
        | undefined;

      return throwError(
        () =>
          ({
            status: error.status,
            message: body?.error?.message || error.statusText || 'Request failed',
            details: body?.error?.details,
          }) satisfies ApiFailure,
      );
    }),
  );
