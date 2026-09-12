import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiFailure } from '../../core/models/api.model';
import { Category } from '../../core/models/category.model';
import { CategoryService } from '../../core/services/category.service';
import { I18nService } from '../../core/services/i18n.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmDialogComponent } from '../shared/confirm-dialog.component';

@Component({
  selector: 'app-admin-categories',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ConfirmDialogComponent],
  template: `
    <div class="admin-page">
      <header class="admin-head">
        <div>
          <h1 class="admin-title">{{ i18n.dict().admin.categories.title }}</h1>
          <p class="admin-subtitle">{{ i18n.dict().admin.categories.emptyBody }}</p>
        </div>
        <div class="admin-actions">
          <button type="button" class="btn btn--primary btn--small" (click)="startCreate()">
            {{ i18n.dict().admin.categories.add }}
          </button>
        </div>
      </header>

      <div class="split">
        <!-- List -->
        <div class="split__list">
          @if (loading()) {
            <div class="admin-loading"><span></span><span></span><span></span></div>
          } @else if (!categories.categories().length) {
            <div class="admin-empty">
              <p class="admin-empty__title">{{ i18n.dict().admin.categories.empty }}</p>
              <p class="admin-empty__body">{{ i18n.dict().admin.categories.emptyBody }}</p>
            </div>
          } @else {
            <ul class="cats">
              @for (category of categories.categories(); track category.id) {
                <li class="cat" [class.is-editing]="editing()?.id === category.id">
                  <div class="cat__main">
                    <strong class="cat__name">{{ i18n.localize(category, 'name') }}</strong>
                    <span class="cat__slug">{{ category.slug }}</span>
                  </div>

                  <span class="cat__count">
                    {{ i18n.formatNumber(category._count?.machines ?? 0) }}
                    {{ i18n.dict().admin.categories.machineCount }}
                  </span>

                  <div class="admin-table__actions">
                    <button
                      type="button"
                      class="icon-btn"
                      (click)="startEdit(category)"
                      [attr.aria-label]="i18n.dict().common.edit"
                    >
                      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M11 2.5 13.5 5 5.5 13H3v-2.5z" stroke-linejoin="round" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      class="icon-btn is-danger"
                      (click)="pendingDelete.set(category)"
                      [attr.aria-label]="i18n.dict().common.delete"
                    >
                      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                    </button>
                  </div>
                </li>
              }
            </ul>
          }
        </div>

        <!-- Editor -->
        @if (showForm()) {
          <aside class="split__form admin-card">
            <h2 class="admin-card__title">
              {{ editing() ? i18n.dict().admin.categories.edit : i18n.dict().admin.categories.add }}
            </h2>

            <form [formGroup]="form" (ngSubmit)="save()" novalidate>
              <div class="field">
                <label class="label" for="cat-nameEn">
                  {{ i18n.dict().admin.categories.nameEn }} <span class="req">*</span>
                </label>
                <input id="cat-nameEn" class="input admin-en" formControlName="nameEn" />
              </div>

              <div class="field">
                <label class="label" for="cat-nameAr">
                  {{ i18n.dict().admin.categories.nameAr }} <span class="req">*</span>
                </label>
                <input id="cat-nameAr" class="input admin-ar" formControlName="nameAr" />
              </div>

              <div class="field">
                <label class="label" for="cat-descEn">{{ i18n.dict().admin.categories.descriptionEn }}</label>
                <textarea id="cat-descEn" class="textarea admin-en" formControlName="descriptionEn"></textarea>
              </div>

              <div class="field">
                <label class="label" for="cat-descAr">{{ i18n.dict().admin.categories.descriptionAr }}</label>
                <textarea id="cat-descAr" class="textarea admin-ar" formControlName="descriptionAr"></textarea>
              </div>

              <div class="field">
                <label class="label" for="cat-order">{{ i18n.dict().admin.form.sortOrder }}</label>
                <input id="cat-order" class="input" type="number" min="0" formControlName="sortOrder" />
              </div>

              <div class="split__actions">
                <button type="button" class="btn btn--ghost btn--small" (click)="cancel()">
                  {{ i18n.dict().common.cancel }}
                </button>
                <button type="submit" class="btn btn--primary btn--small" [disabled]="saving()">
                  {{ saving() ? i18n.dict().common.loading : i18n.dict().common.save }}
                </button>
              </div>
            </form>
          </aside>
        }
      </div>
    </div>

    @if (pendingDelete(); as target) {
      <app-confirm-dialog
        [title]="i18n.dict().admin.categories.confirmDelete"
        [body]="i18n.localize(target, 'name') + ' — ' + i18n.dict().admin.categories.confirmDeleteBody"
        [busy]="deleting()"
        (confirmed)="confirmDelete()"
        (cancelled)="pendingDelete.set(null)"
      />
    }
  `,
  styles: `
    .split {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 380px;
      gap: 1.25rem;
      align-items: start;
    }

    .cats {
      list-style: none;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .cat {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.9rem 1.1rem;
      background: var(--ink-850);
      border: 1px solid var(--line);
      border-radius: var(--radius-sm);
      transition: border-color var(--dur-fast) var(--ease);

      &.is-editing {
        border-color: var(--blue);
      }
    }

    .cat__main {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
      flex: 1;
      min-width: 0;
    }

    .cat__name {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--fg-strong);
    }

    .cat__slug {
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      color: var(--text-mute);
    }

    .cat__count {
      font-size: 0.75rem;
      color: var(--text-mute);
      white-space: nowrap;
    }

    .split__form form {
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
    }

    .split__form .textarea {
      min-height: 80px;
    }

    .split__actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 0.25rem;
    }

    @media (max-width: 900px) {
      .split {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class AdminCategoriesComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly categories = inject(CategoryService);
  private readonly toasts = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly deleting = signal(false);
  protected readonly showForm = signal(false);
  protected readonly editing = signal<Category | null>(null);
  protected readonly pendingDelete = signal<Category | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    nameEn: ['', [Validators.required, Validators.maxLength(120)]],
    nameAr: ['', [Validators.required, Validators.maxLength(120)]],
    descriptionEn: [''],
    descriptionAr: [''],
    sortOrder: [0],
  });

  constructor() {
    this.reload();
  }

  private reload(): void {
    this.loading.set(true);
    this.categories.load(true).subscribe({
      next: () => this.loading.set(false),
      error: () => this.loading.set(false),
    });
  }

  protected startCreate(): void {
    this.editing.set(null);
    this.form.reset({ nameEn: '', nameAr: '', descriptionEn: '', descriptionAr: '', sortOrder: 0 });
    this.showForm.set(true);
  }

  protected startEdit(category: Category): void {
    this.editing.set(category);
    this.form.reset({
      nameEn: category.nameEn,
      nameAr: category.nameAr,
      descriptionEn: category.descriptionEn ?? '',
      descriptionAr: category.descriptionAr ?? '',
      sortOrder: category.sortOrder,
    });
    this.showForm.set(true);
  }

  protected cancel(): void {
    this.showForm.set(false);
    this.editing.set(null);
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const value = this.form.getRawValue();
    const payload = {
      nameEn: value.nameEn.trim(),
      nameAr: value.nameAr.trim(),
      descriptionEn: value.descriptionEn.trim() || null,
      descriptionAr: value.descriptionAr.trim() || null,
      sortOrder: Number(value.sortOrder) || 0,
    };

    const current = this.editing();
    const request$ = current
      ? this.categories.update(current.id, payload)
      : this.categories.create(payload);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.editing.set(null);
        this.toasts.success(this.i18n.dict().admin.categories.saved);
        this.reload();
      },
      error: (failure: ApiFailure) => {
        this.saving.set(false);
        this.toasts.error(failure.message);
      },
    });
  }

  protected confirmDelete(): void {
    const category = this.pendingDelete();
    if (!category) return;

    this.deleting.set(true);
    this.categories.remove(category.id).subscribe({
      next: (result) => {
        this.deleting.set(false);
        this.pendingDelete.set(null);
        this.toasts.success(result.message || this.i18n.dict().admin.categories.deleted);
        this.reload();
      },
      error: (failure: ApiFailure) => {
        this.deleting.set(false);
        this.pendingDelete.set(null);
        this.toasts.error(failure.message);
      },
    });
  }
}
