import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiFailure } from '../../core/models/api.model';
import { AuthService } from '../../core/services/auth.service';
import { I18nService } from '../../core/services/i18n.service';
import { SeoService } from '../../core/services/seo.service';
import { LogoComponent } from '../../shared/components/logo/logo.component';

@Component({
  selector: 'app-admin-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, LogoComponent],
  template: `
    <div class="login">
      <div class="grid-bg" aria-hidden="true"></div>

      <div class="login__card">
        <span class="ticks" aria-hidden="true"></span>

        <a class="login__brand" routerLink="/">
          <app-logo variant="lockup" [eager]="true" />
        </a>

        <h1 class="login__title">{{ i18n.dict().admin.loginTitle }}</h1>
        <p class="login__sub">{{ i18n.dict().admin.loginSubtitle }}</p>

        <form class="login__form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="field">
            <label class="label" for="al-email">{{ i18n.dict().admin.email }}</label>
            <input
              id="al-email"
              class="input"
              type="email"
              formControlName="email"
              autocomplete="username"
              dir="ltr"
              required
            />
          </div>

          <div class="field">
            <label class="label" for="al-password">{{ i18n.dict().admin.password }}</label>
            <div class="login__password">
              <input
                id="al-password"
                class="input"
                [type]="reveal() ? 'text' : 'password'"
                formControlName="password"
                autocomplete="current-password"
                dir="ltr"
                required
              />
              <button
                type="button"
                class="login__peek"
                (click)="reveal.set(!reveal())"
                [attr.aria-label]="reveal() ? 'Hide password' : 'Show password'"
              >
                <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
                  <path
                    d="M1.7 10S4.8 4.8 10 4.8 18.3 10 18.3 10 15.2 15.2 10 15.2 1.7 10 1.7 10Z"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.4"
                  />
                  <circle cx="10" cy="10" r="2.6" fill="none" stroke="currentColor" stroke-width="1.4" />
                  @if (reveal()) {
                    <path d="m3 17 14-14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
                  }
                </svg>
              </button>
            </div>
          </div>

          @if (error()) {
            <p class="login__error" role="alert">{{ error() }}</p>
          }

          <button type="submit" class="btn btn--primary btn--block" [disabled]="busy()">
            @if (busy()) {
              <span class="spinner" aria-hidden="true"></span>
              {{ i18n.dict().admin.signingIn }}
            } @else {
              {{ i18n.dict().admin.signIn }}
            }
          </button>
        </form>

        <a class="login__back" routerLink="/">{{ i18n.dict().admin.backToSite }}</a>
      </div>
    </div>
  `,
  styles: `
    .login {
      position: relative;
      min-height: 100vh;
      min-height: 100dvh;
      display: grid;
      place-items: center;
      padding: var(--gutter);
      overflow: hidden;
      background:
        radial-gradient(ellipse 60% 60% at 50% 35%, rgba(0, 123, 255, 0.14), transparent 68%),
        var(--ink-1000);
    }

    .login__card {
      position: relative;
      width: min(100%, 420px);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: clamp(1.75rem, 5vw, 2.75rem);
      background: linear-gradient(160deg, var(--ink-800), var(--ink-850));
      border: 1px solid var(--line-strong);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-pop);

      .ticks::before,
      .ticks::after {
        opacity: 0.55;
      }
    }

    .login__brand {
      --logo-h: 80px;
      margin-bottom: 1.25rem;
    }

    .login__title {
      font-size: 1.375rem;
    }

    .login__sub {
      font-size: 0.875rem;
      color: var(--text-mute);
      text-align: center;
      margin-bottom: 1.25rem;
    }

    .login__form {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .login__password {
      position: relative;
    }

    .login__peek {
      position: absolute;
      inset-inline-end: 0.6rem;
      top: 50%;
      transform: translateY(-50%);
      display: grid;
      place-items: center;
      width: 30px;
      height: 30px;
      color: var(--text-mute);
      border-radius: var(--radius-sm);
      transition: color var(--dur-fast) var(--ease);

      &:hover {
        color: var(--fg-strong);
      }
    }

    .login__error {
      padding: 0.7rem 0.9rem;
      background: rgba(255, 92, 108, 0.1);
      border: 1px solid rgba(255, 92, 108, 0.35);
      border-radius: var(--radius-sm);
      color: var(--danger);
      font-size: 0.8125rem;
    }

    .login__back {
      margin-top: 1.25rem;
      font-size: 0.8125rem;
      color: var(--text-mute);
      transition: color var(--dur-fast) var(--ease);

      &:hover {
        color: var(--blue-bright);
      }
    }

    .spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: var(--on-accent);
      border-radius: 50%;
      animation: spin 640ms linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `,
})
export class AdminLoginComponent {
  protected readonly i18n = inject(I18nService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly seo = inject(SeoService);

  protected readonly busy = signal(false);
  protected readonly reveal = signal(false);
  protected readonly error = signal('');

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  constructor() {
    // The dashboard must never appear in search results.
    this.seo.apply({ title: this.i18n.dict().admin.title, noIndex: true });
  }

  protected submit(): void {
    if (this.form.invalid || this.busy()) {
      this.form.markAllAsTouched();
      return;
    }

    this.busy.set(true);
    this.error.set('');

    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/admin';
        void this.router.navigateByUrl(returnUrl);
      },
      error: (failure: ApiFailure) => {
        this.busy.set(false);
        this.error.set(failure.message || this.i18n.dict().admin.loginFailed);
      },
    });
  }
}
