import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Protects every /admin route except the login page.
 *
 * On a cold load the guard has a token in storage but no verified user yet, so
 * it validates against the API before deciding. That means a tampered or
 * expired token cannot reveal the dashboard shell even for a moment.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const redirectToLogin = () =>
    router.createUrlTree(['/admin/login'], { queryParams: { returnUrl: state.url } });

  if (auth.isAuthenticated()) return true;

  if (!auth.accessToken) return redirectToLogin();

  return auth.restore().pipe(
    map(() => true as const),
    catchError(() => of(redirectToLogin())),
  );
};

/** Keeps a signed-in admin from landing back on the login form. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) return true;
  return router.createUrlTree(['/admin']);
};
