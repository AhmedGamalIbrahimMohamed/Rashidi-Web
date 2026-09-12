import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { I18nService } from '../../../core/services/i18n.service';
import { MachineStatus } from '../../../core/models/machine.model';

/**
 * Availability indicator.
 *
 * The three states are distinguished by colour *and* by shape — a filled
 * pulsing dot for Available, a hollow ring for In Stock, a crossed dot for
 * Sold — so the status is still readable without colour vision.
 */
@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="badge" [attr.data-status]="status()" [class.badge--lg]="size() === 'lg'">
      <span class="badge__dot" aria-hidden="true"></span>
      <span class="badge__label">{{ label() }}</span>
    </span>
  `,
  styles: `
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.3rem 0.7rem 0.3rem 0.6rem;
      border-radius: 100px;
      border: 1px solid currentColor;
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      font-weight: 500;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      white-space: nowrap;
      backdrop-filter: blur(8px);
    }

    [dir='rtl'] .badge {
      letter-spacing: 0;
      font-family: var(--font-body);
      padding-inline: 0.6rem 0.7rem;
    }

    .badge--lg {
      padding: 0.45rem 0.95rem 0.45rem 0.8rem;
      font-size: 0.75rem;
    }

    .badge__dot {
      position: relative;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: currentColor;
      flex-shrink: 0;
    }

    /* --- Available: live, pulsing ------------------------------------------ */
    .badge[data-status='AVAILABLE'] {
      color: var(--status-available);
      background: var(--status-available-bg);
    }

    .badge[data-status='AVAILABLE'] .badge__dot::after {
      content: '';
      position: absolute;
      inset: -4px;
      border-radius: 50%;
      border: 1px solid currentColor;
      animation: badge-pulse 2.4s var(--ease-in-out) infinite;
    }

    /* --- In stock: hollow ring --------------------------------------------- */
    .badge[data-status='IN_STOCK'] {
      color: var(--status-stock);
      background: var(--status-stock-bg);
    }

    .badge[data-status='IN_STOCK'] .badge__dot {
      background: transparent;
      border: 2px solid currentColor;
    }

    /* --- Sold: muted, struck through --------------------------------------- */
    .badge[data-status='SOLD'] {
      color: var(--status-sold);
      background: var(--status-sold-bg);
    }

    .badge[data-status='SOLD'] .badge__dot::after {
      content: '';
      position: absolute;
      inset-inline-start: -3px;
      top: 3px;
      width: 13px;
      height: 1.5px;
      background: currentColor;
      transform: rotate(-45deg);
    }

    @keyframes badge-pulse {
      0% {
        transform: scale(0.85);
        opacity: 0.9;
      }
      70% {
        transform: scale(1.6);
        opacity: 0;
      }
      100% {
        transform: scale(1.6);
        opacity: 0;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .badge__dot::after {
        animation: none;
      }
    }
  `,
})
export class StatusBadgeComponent {
  private readonly i18n = inject(I18nService);

  readonly status = input.required<MachineStatus>();
  readonly size = input<'md' | 'lg'>('md');

  protected readonly label = computed(() => this.i18n.dict().status[this.status()]);
}
