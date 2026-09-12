import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AdminUser, AuthSession, LoginPayload } from '../models/auth.model';
import { ApiService } from './api.service';

/**
 * JWT session state.
 *
 * Tokens are held in localStorage. That is a deliberate trade-off: the admin
 * area is a separate, low-traffic surface behind a login, and httpOnly cookies
 * would require the API and the site to share an origin (or a CSRF scheme) —
 * complexity this deployment does not need. The access token is short-lived
 * and the interceptor refreshes it silently.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);

  private readonly _user = signal<AdminUser | null>(null);
  private readonly _checked = signal(false);

  readonly user = this._user.asReadonly();
  /** True once the initial token check has completed — guards wait on this. */
  readonly checked = this._checked.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly isAdmin = computed(() => this._user()?.role === 'ADMIN');

  get accessToken(): string | null {
    return this.read(environment.auth.tokenKey);
  }

  get refreshToken(): string | null {
    return this.read(environment.auth.refreshTokenKey);
  }

  login(payload: LoginPayload): Observable<AuthSession> {
    return this.api
      .post<AuthSession>('auth/login', payload)
      .pipe(tap((session) => this.store(session)));
  }

  /** Used by the interceptor when a request comes back 401. */
  refresh(): Observable<AuthSession> {
    return this.api
      .post<AuthSession>('auth/refresh', { refreshToken: this.refreshToken })
      .pipe(tap((session) => this.store(session)));
  }

  /**
   * Verifies the stored token against the API on boot. Resolves to null rather
   * than erroring, so a stale token simply means "signed out".
   */
  restore(): Observable<AdminUser> {
    return this.api.get<AdminUser>('auth/me').pipe(
      tap({
        next: (user) => {
          this._user.set(user);
          this._checked.set(true);
        },
        error: () => {
          this.clear();
          this._checked.set(true);
        },
      }),
    );
  }

  markChecked(): void {
    this._checked.set(true);
  }

  logout(redirect = true): void {
    this.clear();
    if (redirect) void this.router.navigate(['/admin/login']);
  }

  changePassword(currentPassword: string, newPassword: string): Observable<{ message: string }> {
    return this.api.post<{ message: string }>('auth/change-password', {
      currentPassword,
      newPassword,
    });
  }

  // --- internals ------------------------------------------------------------

  private store(session: AuthSession): void {
    this.write(environment.auth.tokenKey, session.accessToken);
    this.write(environment.auth.refreshTokenKey, session.refreshToken);
    this._user.set(session.user);
    this._checked.set(true);
  }

  private clear(): void {
    this.remove(environment.auth.tokenKey);
    this.remove(environment.auth.refreshTokenKey);
    this._user.set(null);
  }

  private get storage(): Storage | null {
    try {
      return this.document.defaultView?.localStorage ?? null;
    } catch {
      return null;
    }
  }

  private read(key: string): string | null {
    try {
      return this.storage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  private write(key: string, value: string): void {
    try {
      this.storage?.setItem(key, value);
    } catch {
      // Storage unavailable — the session lasts until the tab is closed.
    }
  }

  private remove(key: string): void {
    try {
      this.storage?.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}
