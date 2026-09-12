import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { I18nService } from '../../../core/services/i18n.service';

/**
 * The brand mark.
 *
 * `variant="lockup"` renders the full mark + wordmark for the intro and footer;
 * `variant="mark"` renders the R on its own for the compact header and mobile.
 * Both are the supplied brand artwork with a real alpha channel, so they sit on
 * any dark surface without a plate behind them.
 */
@Component({
  selector: 'app-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="logo" [class.logo--lockup]="variant() === 'lockup'">
      <img
        class="logo__img"
        [src]="variant() === 'lockup' ? 'logo.png' : 'logo-mark.png'"
        [attr.width]="variant() === 'lockup' ? 720 : 420"
        [attr.height]="variant() === 'lockup' ? 448 : 284"
        [alt]="alt()"
        [attr.loading]="eager() ? null : 'lazy'"
        decoding="async"
        fetchpriority="high"
      />

      @if (variant() === 'mark' && withWordmark()) {
        <span class="logo__text" aria-hidden="true">
          <span class="logo__name">{{ i18n.dict().brand.name }}</span>
          <span class="logo__sub">{{ i18n.dict().brand.sub }}</span>
        </span>
      }
    </span>
  `,
  styles: `
    .logo {
      display: inline-flex;
      align-items: center;
      gap: 0.7rem;
    }

    .logo__img {
      height: var(--logo-h, 34px);
      width: auto;
      /* The artwork has no drop shadow of its own; a faint blue bloom keeps it
         from looking pasted onto the dark ground. */
      filter: drop-shadow(0 0 14px rgba(0, 123, 255, 0.18));
    }

    .logo--lockup .logo__img {
      height: var(--logo-h, 96px);
    }

    .logo__text {
      display: flex;
      flex-direction: column;
      line-height: 1;
    }

    .logo__name {
      font-family: var(--font-display);
      font-size: 1.0625rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--white);
    }

    .logo__sub {
      font-family: var(--font-mono);
      font-size: 0.5625rem;
      letter-spacing: 0.24em;
      text-transform: uppercase;
      color: var(--text-mute);
      margin-top: 3px;
    }

    [dir='rtl'] .logo__name {
      letter-spacing: 0;
    }

    [dir='rtl'] .logo__sub {
      letter-spacing: 0.05em;
      font-family: var(--font-body);
    }

    @media (max-width: 480px) {
      .logo__text {
        display: none;
      }
    }
  `,
})
export class LogoComponent {
  protected readonly i18n = inject(I18nService);

  readonly variant = input<'mark' | 'lockup'>('mark');
  readonly withWordmark = input(true);
  readonly eager = input(false);

  protected readonly alt = computed(() => this.i18n.dict().brand.full);
}
