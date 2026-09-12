import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiFailure } from '../../core/models/api.model';
import { AuthService } from '../../core/services/auth.service';
import { I18nService } from '../../core/services/i18n.service';
import { ToastService } from '../../core/services/toast.service';

/** Cross-field check: the confirmation must match the new password. */
const passwordsMatch = (group: AbstractControl) => {
  const next = group.get('newPassword')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return next && confirm && next !== confirm ? { mismatch: true } : null;
};

@Component({
  selector: 'app-admin-account',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <div class="admin-page">
      <header class="admin-head">
        <div>
          <h1 class="admin-title">{{ i18n.dict().admin.account.title }}</h1>
        </div>
      </header>

      <div class="cols">
        <!-- Profile -->
        <section class="admin-card">
          <h2 class="admin-card__title">{{ auth.user()?.name }}</h2>

          <dl class="facts">
            <div>
              <dt>{{ i18n.dict().admin.email }}</dt>
              <dd>{{ auth.user()?.email }}</dd>
            </div>
            <div>
              <dt>{{ i18n.dict().admin.account.role }}</dt>
              <dd>{{ auth.user()?.role }}</dd>
            </div>
            <div>
              <dt>{{ i18n.dict().admin.account.lastLogin }}</dt>
              <dd>
                {{
                  auth.user()?.lastLogin
                    ? i18n.formatDate(auth.user()!.lastLogin!, { hour: '2-digit', minute: '2-digit' })
                    : i18n.dict().admin.account.never
                }}
              </dd>
            </div>
          </dl>
        </section>

        <!-- Password -->
        <section class="admin-card">
          <h2 class="admin-card__title">{{ i18n.dict().admin.account.changePassword }}</h2>

          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <div class="field">
              <label class="label" for="ac-current">{{ i18n.dict().admin.account.currentPassword }}</label>
              <input id="ac-current" class="input" type="password" formControlName="currentPassword" autocomplete="current-password" dir="ltr" />
            </div>

            <div class="field">
              <label class="label" for="ac-new">{{ i18n.dict().admin.account.newPassword }}</label>
              <input id="ac-new" class="input" type="password" formControlName="newPassword" autocomplete="new-password" dir="ltr" />
              @if (form.get('newPassword')?.touched && form.get('newPassword')?.hasError('minlength')) {
                <span class="field-error">{{ i18n.dict().admin.account.passwordShort }}</span>
              }
            </div>

            <div class="field">
              <label class="label" for="ac-confirm">{{ i18n.dict().admin.account.confirmPassword }}</label>
              <input id="ac-confirm" class="input" type="password" formControlName="confirmPassword" autocomplete="new-password" dir="ltr" />
              @if (form.hasError('mismatch') && form.get('confirmPassword')?.touched) {
                <span class="field-error">{{ i18n.dict().admin.account.passwordMismatch }}</span>
              }
            </div>

            <button type="submit" class="btn btn--primary btn--small" [disabled]="busy()">
              {{ busy() ? i18n.dict().common.loading : i18n.dict().common.save }}
            </button>
          </form>
        </section>
      </div>
    </div>
  `,
  styles: `
    .cols {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1rem;
      align-items: start;
      max-width: 900px;
    }

    .facts {
      display: flex;
      flex-direction: column;

      div {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.7rem 0;
        border-bottom: 1px solid var(--line);
        font-size: 0.875rem;

        &:last-child {
          border-bottom: 0;
        }
      }

      dt {
        color: var(--text-mute);
      }

      dd {
        color: var(--fg-strong);
        font-weight: 500;
        text-align: end;
        word-break: break-word;
      }
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
      align-items: flex-start;
    }

    form .field {
      width: 100%;
    }
  `,
})
export class AdminAccountComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly auth = inject(AuthService);
  private readonly toasts = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  protected readonly busy = signal(false);

  protected readonly form = this.fb.nonNullable.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(10)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.busy.set(true);
    const { currentPassword, newPassword } = this.form.getRawValue();

    this.auth.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.busy.set(false);
        this.form.reset();
        this.toasts.success(this.i18n.dict().admin.account.passwordChanged);
      },
      error: (failure: ApiFailure) => {
        this.busy.set(false);
        this.toasts.error(failure.message);
      },
    });
  }
}
