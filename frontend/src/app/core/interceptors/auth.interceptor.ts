import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

/** Endpoints that must never carry (or retry with) a token. */
const PUBLIC_PATHS = ['/auth/login', '/auth/refresh'];

/**
 * Shared refresh state. Without this, five parallel dashboard requests hitting
 * a just-expired token would fire five refreshes and invalidate each other.
 * The first 401 starts a refresh; the rest queue on `refreshed$`.
 */
let isRefreshing = false;
const refreshed$ = new BehaviorSubject<string | null>(null);

const withToken = (request: HttpRequest<unknown>, token: string): HttpRequest<unknown> =>
  request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });

export const authInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const auth = inject(AuthService);

  const isApiCall = request.url.startsWith(environment.apiUrl);
  const isPublic = PUBLIC_PATHS.some((path) => request.url.includes(path));

  const token = auth.accessToken;
  const outgoing = isApiCall && !isPublic && token ? withToken(request, token) : request;

  return next(outgoing).pipe(
    catchError((error: unknown) => {
      const is401 = error instanceof HttpErrorResponse && error.status === 401;

      if (!is401 || !isApiCall || isPublic || !auth.refreshToken) {
        return throwError(() => error);
      }

      if (isRefreshing) {
        // Wait for the in-flight refresh, then replay this request once.
        return refreshed$.pipe(
          filter((value): value is string => value !== null),
          take(1),
          switchMap((fresh) => next(withToken(request, fresh))),
        );
      }

      isRefreshing = true;
      refreshed$.next(null);

      return auth.refresh().pipe(
        switchMap((session) => {
          isRefreshing = false;
          refreshed$.next(session.accessToken);
          return next(withToken(request, session.accessToken));
        }),
        catchError((refreshError: unknown) => {
          isRefreshing = false;
          refreshed$.next(null);
          auth.logout();
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
