import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toasts',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toasts" role="status" aria-live="polite">
      @for (toast of toasts.toasts(); track toast.id) {
        <div class="toast" [attr.data-kind]="toast.kind">
          <span class="toast__mark" aria-hidden="true"></span>
          <p class="toast__text">{{ toast.message }}</p>
          <button type="button" class="toast__close" (click)="toasts.dismiss(toast.id)" aria-label="Dismiss">
            <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true">
              <path d="m2 2 8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .toasts {
      position: fixed;
      bottom: 1.25rem;
      inset-inline-end: 1.25rem;
      z-index: 5000;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-width: min(380px, calc(100vw - 2.5rem));
      pointer-events: none;
    }

    .toast {
      display: flex;
      align-items: flex-start;
      gap: 0.7rem;
      padding: 0.85rem 0.9rem;
      background: var(--glass-strong);
      border: 1px solid var(--line-strong);
      border-radius: var(--radius-sm);
      backdrop-filter: blur(14px);
      box-shadow: var(--shadow-card);
      pointer-events: auto;
      animation: toast-in 320ms var(--ease);
    }

    .toast__mark {
      width: 3px;
      align-self: stretch;
      border-radius: 3px;
      flex-shrink: 0;
    }

    .toast[data-kind='success'] .toast__mark {
      background: var(--status-available);
    }
    .toast[data-kind='error'] .toast__mark {
      background: var(--danger);
    }
    .toast[data-kind='info'] .toast__mark {
      background: var(--blue);
    }

    .toast__text {
      flex: 1;
      font-size: 0.875rem;
      line-height: 1.5;
      color: var(--text);
    }

    .toast__close {
      color: var(--text-mute);
      padding: 0.15rem;
      transition: color var(--dur-fast) var(--ease);

      &:hover {
        color: var(--fg-strong);
      }
    }

    @keyframes toast-in {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .toast {
        animation: none;
      }
    }
  `,
})
export class ToastComponent {
  protected readonly toasts = inject(ToastService);
}
