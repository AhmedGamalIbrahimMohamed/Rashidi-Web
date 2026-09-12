import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { I18nService } from '../../../core/services/i18n.service';
import { ThemeService } from '../../../core/services/theme.service';

/**
 * The brand mark.
 *
 * `variant="lockup"` renders the full mark + wordmark for the intro and footer;
 * `variant="mark"` renders the R on its own for the compact header and mobile.
 *
 * Two colourways ship, per the brand sheet: white ink for dark surfaces and
 * charcoal ink for light ones. Both are the same artwork and share an identical
 * alpha mask, so switching theme swaps the file without any shift in position.
 */
@Component({
  selector: 'app-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="logo" [class.logo--lockup]="variant() === 'lockup'">
      <img
        class="logo__img"
        [src]="source()"
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
    }

    /* A faint blue bloom keeps the white mark from looking pasted onto the dark
       ground. On white it would only read as a smudge, so it is dark-only. */
    :host-context(:root[data-theme='dark']) .logo__img {
      filter: drop-shadow(0 0 14px rgba(96, 165, 250, 0.22));
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
      color: var(--fg-strong);
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
  private readonly theme = inject(ThemeService);

  readonly variant = input<'mark' | 'lockup'>('mark');
  readonly withWordmark = input(true);
  readonly eager = input(false);

  protected readonly alt = computed(() => this.i18n.dict().brand.full);

  /** White ink on dark surfaces, charcoal ink on light ones. */
  protected readonly source = computed(() => {
    const base = this.variant() === 'lockup' ? 'logo' : 'logo-mark';
    return this.theme.isDark() ? `${base}.png` : `${base}-light.png`;
  });
}
