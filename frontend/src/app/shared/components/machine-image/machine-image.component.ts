import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { I18nService } from '../../../core/services/i18n.service';
import { MachineImage } from '../../../core/models/machine.model';

/**
 * Photograph slot for machinery, with three states it has to handle well:
 *
 *   1. loading  — the stored 20px LQIP is stretched behind the real file, so the
 *                 card fills with the right colours instead of a grey box;
 *   2. loaded   — crossfades in;
 *   3. missing  — a designed blueprint placeholder rather than a broken icon,
 *                 because the catalogue is seeded before the company uploads
 *                 its photographs and must still look deliberate.
 *
 * Intrinsic width/height are emitted so the browser reserves layout space and
 * the grid does not reflow as images arrive.
 */
@Component({
  selector: 'app-machine-image',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!failed() && image(); as source) {
      <div
        class="frame"
        [class.is-loaded]="loaded()"
        [style.aspect-ratio]="ratio()"
        [style.background-image]="source.blurDataUrl ? 'url(' + source.blurDataUrl + ')' : null"
      >
        <img
          class="frame__img"
          [src]="thumb() && source.thumbnailUrl ? source.thumbnailUrl : source.url"
          [alt]="altText()"
          [attr.width]="source.width"
          [attr.height]="source.height"
          [attr.loading]="eager() ? 'eager' : 'lazy'"
          [attr.fetchpriority]="eager() ? 'high' : null"
          decoding="async"
          (load)="loaded.set(true)"
          (error)="failed.set(true)"
        />
      </div>
    } @else {
      <!-- Placeholder: blueprint grid, an abstract machine profile and a caption. -->
      <div class="frame frame--empty is-loaded" [style.aspect-ratio]="ratio()" role="img" [attr.aria-label]="altText()">
        <svg class="frame__blueprint" viewBox="0 0 160 110" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
          <defs>
            <pattern id="mi-grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M10 0H0v10" fill="none" stroke="currentColor" stroke-width="0.3" />
            </pattern>
          </defs>
          <rect width="160" height="110" fill="url(#mi-grid)" opacity="0.5" />
          <g fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.55">
            <rect x="36" y="44" width="58" height="26" rx="2" />
            <rect x="94" y="50" width="30" height="14" rx="1.5" />
            <circle cx="52" cy="57" r="7" />
            <circle cx="52" cy="57" r="2.4" />
            <path d="M36 70v8H30M124 64v14h-8" />
            <path d="M60 44V34h34v10" />
            <path d="M20 78h120" stroke-dasharray="3 3" />
          </g>
        </svg>
        <span class="frame__caption">{{ i18n.dict().machine.noImage }}</span>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
      position: relative;
    }

    .frame {
      position: relative;
      width: 100%;
      overflow: hidden;
      background-color: var(--ink-800);
      background-size: cover;
      background-position: center;
      /* The LQIP is 20px wide — blurring hides its blocks and leaves the colour. */
      filter: none;
    }

    .frame__img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0;
      transform: scale(1.04);
      transition:
        opacity 600ms var(--ease),
        transform 900ms var(--ease);
    }

    .frame.is-loaded .frame__img {
      opacity: 1;
      transform: scale(1);
    }

    /* --- Empty state -------------------------------------------------------- */

    .frame--empty {
      display: grid;
      place-items: center;
      background: linear-gradient(150deg, var(--ink-700) 0%, var(--ink-900) 70%);
      color: var(--blue);
    }

    .frame__blueprint {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      color: var(--blue-bright);
      opacity: var(--blueprint-opacity, 0.22);
    }

    .frame__caption {
      position: relative;
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--text-mute);
      background: var(--glass-strong);
      padding: 0.35rem 0.8rem;
      border: 1px solid var(--line);
      border-radius: 100px;
      backdrop-filter: blur(4px);
    }

    [dir='rtl'] .frame__caption {
      letter-spacing: 0;
      font-family: var(--font-body);
    }
  `,
})
export class MachineImageComponent {
  protected readonly i18n = inject(I18nService);

  readonly image = input<MachineImage | null>(null);
  /** Falls back to the machine name when the image carries no alt text. */
  readonly fallbackAlt = input('');
  readonly ratio = input('4 / 3');
  /** Use the 640px variant — correct for cards and gallery strips. */
  readonly thumb = input(true);
  /** Skips lazy loading for above-the-fold images. */
  readonly eager = input(false);

  protected readonly loaded = signal(false);
  protected readonly failed = signal(false);

  protected readonly altText = computed(() => {
    const source = this.image();
    const stored = source ? this.i18n.localize(source, 'alt') : '';
    return stored || this.fallbackAlt();
  });
}
