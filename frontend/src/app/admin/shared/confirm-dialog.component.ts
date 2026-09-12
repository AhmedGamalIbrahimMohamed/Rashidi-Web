import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  afterNextRender,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { I18nService } from '../../core/services/i18n.service';

/**
 * Confirmation dialog for destructive dashboard actions.
 *
 * Rendered only when the parent wants it, so there is no hidden dialog in the
 * DOM. Focus moves to the cancel button on open — the safe default — and
 * Escape always dismisses.
 */
@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="backdrop" (click)="cancelled.emit()">
      <div
        class="dialog"
        role="alertdialog"
        aria-modal="true"
        [attr.aria-label]="title()"
        (click)="$event.stopPropagation()"
      >
        <h2 class="dialog__title">{{ title() }}</h2>
        @if (body()) {
          <p class="dialog__body">{{ body() }}</p>
        }

        <div class="dialog__actions">
          <button type="button" class="btn btn--ghost btn--small" #cancel (click)="cancelled.emit()">
            {{ i18n.dict().common.cancel }}
          </button>
          <button
            type="button"
            class="btn btn--small dialog__danger"
            [disabled]="busy()"
            (click)="confirmed.emit()"
          >
            {{ busy() ? i18n.dict().common.loading : confirmLabel() || i18n.dict().common.delete }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: `
    .backdrop {
      position: fixed;
      inset: 0;
      z-index: 4000;
      display: grid;
      place-items: center;
      padding: 1.25rem;
      background: var(--scrim);
      backdrop-filter: blur(4px);
      animation: fade 180ms var(--ease);
    }

    .dialog {
      width: min(100%, 420px);
      padding: 1.5rem;
      background: var(--ink-800);
      border: 1px solid var(--line-strong);
      border-radius: var(--radius);
      box-shadow: var(--shadow-pop);
      animation: rise 220ms var(--ease);
    }

    .dialog__title {
      font-size: 1.0625rem;
      margin-bottom: 0.6rem;
    }

    .dialog__body {
      font-size: 0.875rem;
      line-height: 1.6;
      color: var(--text-mute);
      margin-bottom: 1.4rem;
    }

    .dialog__actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
    }

    .dialog__danger {
      --btn-bg: var(--danger);
      --btn-fg: var(--on-accent);
      --btn-border: var(--danger);

      &::before {
        background: #ff7683;
      }

      &:hover {
        border-color: #ff7683;
      }
    }

    @keyframes fade {
      from {
        opacity: 0;
      }
    }

    @keyframes rise {
      from {
        opacity: 0;
        transform: translateY(12px) scale(0.98);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .backdrop,
      .dialog {
        animation: none;
      }
    }
  `,
})
export class ConfirmDialogComponent {
  protected readonly i18n = inject(I18nService);

  readonly title = input.required<string>();
  readonly body = input('');
  readonly confirmLabel = input('');
  readonly busy = input(false);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  private readonly cancelButton = viewChild<ElementRef<HTMLButtonElement>>('cancel');

  constructor() {
    afterNextRender(() => this.cancelButton()?.nativeElement.focus());
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.cancelled.emit();
  }
}
