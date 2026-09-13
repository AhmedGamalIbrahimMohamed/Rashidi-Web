import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  inject,
  input,
} from '@angular/core';
import { Locale } from '../../../core/models/locale.model';
import { I18nService } from '../../../core/services/i18n.service';
import { ThemeService } from '../../../core/services/theme.service';

/**
 * Colourways already requested, so the warm-up runs once per artwork rather
 * than once per component instance.
 */
const warmed = new Set<string>();

/**
 * Pull a colourway into the browser cache ahead of time.
 *
 * Without this, the first theme switch points `src` at a file the browser has
 * never seen and the mark blanks for as long as a ~60kB PNG takes to arrive.
 * In the header, that reads as the whole page stalling.
 */
function warm(source: string): void {
  if (typeof Image === 'undefined' || warmed.has(source)) return;
  warmed.add(source);
  new Image().src = source;
}

/**
 * The brand mark.
 *
 * `variant="mark"` renders the R beside the typeset name — the one lockup shared
 * by the intro splash, the header, the footer and the admin login, so the brand
 * reads identically everywhere and only its scale changes.
 *
 * `variant="lockup"` renders the standalone stacked artwork; it is kept for
 * surfaces that want the mark without the typeset name beside it.
 *
 * Two colourways ship, per the brand sheet: white ink for dark surfaces and
 * charcoal ink for light ones. Both are the same artwork and share an identical
 * alpha mask, so switching theme swaps the file without any shift in position.
 */
@Component({
  selector: 'app-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="logo"
      [class.logo--lockup]="variant() === 'lockup'"
      [class.logo--rtl]="isRtl()"
    >
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
          <span class="logo__name">{{ brand().name }}</span>
          <span class="logo__sub">{{ brand().sub }}</span>
        </span>
      }
    </span>
  `,
  styles: `
    .logo {
      display: inline-flex;
      align-items: center;
      gap: var(--logo-gap, 0.7rem);
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
      font-size: var(--logo-name-size, 1.0625rem);
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--fg-strong);
    }

    .logo__sub {
      font-family: var(--font-mono);
      font-size: var(--logo-sub-size, 0.5625rem);
      letter-spacing: 0.24em;
      text-transform: uppercase;
      color: var(--text-mute);
      margin-top: 3px;
    }

    .logo--rtl .logo__name {
      letter-spacing: 0;
    }

    .logo--rtl .logo__sub {
      letter-spacing: 0.05em;
      font-family: var(--font-body);
    }

    @media (max-width: 480px) {
      .logo__text {
        display: var(--logo-text-mobile, none);
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

  /**
   * Pins the wordmark to one language. Left unset it follows the active
   * locale, which is what every surface but the intro splash wants.
   */
  readonly locale = input<Locale | null>(null);

  private readonly strings = computed(() => {
    const pinned = this.locale();
    return pinned ? this.i18n.dictFor(pinned) : this.i18n.dict();
  });

  protected readonly brand = computed(() => this.strings().brand);

  protected readonly alt = computed(() => this.strings().brand.full);

  /** Follows the pinned language when there is one, the document otherwise. */
  protected readonly isRtl = computed(() => {
    const pinned = this.locale();
    return pinned ? pinned === 'ar' : this.i18n.isRtl();
  });

  constructor() {
    // Warm both colourways once the mark is on screen, so toggling theme is a
    // cache hit rather than a download. Deliberately after render: it must not
    // compete with the first paint for bandwidth.
    afterNextRender(() => {
      const base = this.variant() === 'lockup' ? 'logo' : 'logo-mark';
      warm(`${base}.png`);
      warm(`${base}-light.png`);
    });
  }

  /** White ink on dark surfaces, charcoal ink on light ones. */
  protected readonly source = computed(() => {
    const base = this.variant() === 'lockup' ? 'logo' : 'logo-mark';
    return this.theme.isDark() ? `${base}.png` : `${base}-light.png`;
  });
}
