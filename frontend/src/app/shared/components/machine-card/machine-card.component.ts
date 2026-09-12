import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../../core/services/i18n.service';
import { Machine } from '../../../core/models/machine.model';
import { MachineService } from '../../../core/services/machine.service';
import { MachineImageComponent } from '../machine-image/machine-image.component';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';

/**
 * Catalogue card.
 *
 * The whole card is one link, so the entire surface is a target on touch and
 * screen readers announce a single destination. The hover treatment is built
 * from one transform on the image and one border/glow change — enough to feel
 * responsive without animating six properties per card in a grid of twelve.
 */
@Component({
  selector: 'app-machine-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MachineImageComponent, StatusBadgeComponent],
  template: `
    <a class="card" [routerLink]="['/machines', machine().slug]" [attr.data-status]="machine().status">
      <span class="ticks" aria-hidden="true"></span>

      <span class="card__media">
        <app-machine-image
          [image]="mainImage()"
          [fallbackAlt]="name()"
          [eager]="eager()"
          ratio="4 / 3"
        />
        <span class="card__scrim" aria-hidden="true"></span>

        <span class="card__status">
          <app-status-badge [status]="machine().status" />
        </span>

        @if (machine().isFeatured) {
          <span class="card__flag" aria-hidden="true">★</span>
        }
      </span>

      <span class="card__body">
        @if (categoryName()) {
          <span class="card__category">{{ categoryName() }}</span>
        }

        <h3 class="card__title">{{ name() }}</h3>

        @if (summary()) {
          <p class="card__summary">{{ summary() }}</p>
        }

        <span class="card__foot">
          @if (machine().brand) {
            <span class="card__meta">{{ machine().brand }}</span>
          }
          @if (machine().manufactureYear) {
            <span class="card__meta card__meta--dim">{{ machine().manufactureYear }}</span>
          }
          <span class="card__cta">
            {{ i18n.dict().common.viewDetails }}
            <svg class="card__arrow" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path
                d="M2 8h11M9 4l4 4-4 4"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
        </span>
      </span>
    </a>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }

    .card {
      position: relative;
      display: flex;
      flex-direction: column;
      height: 100%;
      background: linear-gradient(165deg, var(--ink-800), var(--ink-850) 60%);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      overflow: hidden;
      isolation: isolate;
      /* Light themes need real elevation where a dark theme gets away with a
         border alone. */
      box-shadow: var(--shadow-card);
      transition:
        border-color var(--dur) var(--ease),
        transform var(--dur) var(--ease),
        box-shadow var(--dur) var(--ease);
    }

    /* --- Media -------------------------------------------------------------- */

    .card__media {
      position: relative;
      display: block;
      overflow: hidden;
    }

    .card__media app-machine-image {
      transition: transform 700ms var(--ease);
    }

    .card__scrim {
      position: absolute;
      inset: 0;
      background: linear-gradient(to top, var(--scrim) 0%, transparent 46%);
      pointer-events: none;
    }

    .card__status {
      position: absolute;
      bottom: 0.85rem;
      inset-inline-start: 0.85rem;
      z-index: 2;
    }

    .card__flag {
      position: absolute;
      top: 0.85rem;
      inset-inline-end: 0.85rem;
      z-index: 2;
      display: grid;
      place-items: center;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: rgba(0, 123, 255, 0.16);
      border: 1px solid rgba(0, 123, 255, 0.4);
      color: var(--blue-bright);
      font-size: 0.7rem;
      backdrop-filter: blur(6px);
    }

    /* --- Body --------------------------------------------------------------- */

    .card__body {
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
      padding: 1.25rem 1.25rem 1.1rem;
      flex: 1;
    }

    .card__category {
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--blue-bright);
    }

    [dir='rtl'] .card__category {
      letter-spacing: 0;
      font-family: var(--font-body);
    }

    .card__title {
      font-size: 1.125rem;
      line-height: 1.25;
      color: var(--fg-strong);
      transition: color var(--dur) var(--ease);
      /* Two lines maximum keeps every card in a row the same height. */
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .card__summary {
      font-size: 0.875rem;
      line-height: 1.6;
      color: var(--text-mute);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .card__foot {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-top: auto;
      padding-top: 0.9rem;
      border-top: 1px solid var(--line);
      font-size: 0.75rem;
    }

    .card__meta {
      font-family: var(--font-mono);
      color: var(--text-soft);
      letter-spacing: 0.04em;
    }

    .card__meta--dim {
      color: var(--text-mute);
    }

    .card__cta {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      margin-inline-start: auto;
      color: var(--blue-bright);
      font-weight: 600;
      white-space: nowrap;
    }

    .card__arrow {
      transition: transform var(--dur) var(--ease);
      /* Points toward the reading direction in both layouts. */
      transform: scaleX(var(--flip));
    }

    /* --- Interaction -------------------------------------------------------- */

    .card:hover,
    .card:focus-visible {
      border-color: rgba(0, 123, 255, 0.45);
      transform: translateY(-4px);
      box-shadow:
        var(--shadow-card-hover),
        0 0 0 1px color-mix(in srgb, var(--blue) 14%, transparent);
    }

    .card:hover app-machine-image,
    .card:focus-visible app-machine-image {
      transform: scale(1.06);
    }

    .card:hover .card__title {
      color: var(--blue-soft);
    }

    .card:hover .card__arrow {
      transform: translateX(calc(4px * var(--flip))) scaleX(var(--flip));
    }

    .card:hover .ticks::before,
    .card:hover .ticks::after,
    .card:focus-visible .ticks::before,
    .card:focus-visible .ticks::after {
      opacity: 0.85;
    }

    .ticks {
      z-index: 3;
    }

    /* Sold machines are visibly retired without being hidden — a sold unit still
       tells a visitor what this company handles. */
    .card[data-status='SOLD'] app-machine-image {
      filter: var(--sold-filter);
    }

    .card[data-status='SOLD']:hover app-machine-image {
      filter: var(--sold-filter-hover);
    }

    @media (hover: none) {
      .card:hover {
        transform: none;
      }
      .card:hover app-machine-image {
        transform: none;
      }
    }
  `,
})
export class MachineCardComponent {
  protected readonly i18n = inject(I18nService);

  readonly machine = input.required<Machine>();
  readonly eager = input(false);

  protected readonly mainImage = computed(() => MachineService.mainImage(this.machine()));
  protected readonly name = computed(() => this.i18n.localize(this.machine(), 'name'));
  protected readonly summary = computed(() =>
    this.i18n.localize(this.machine(), 'shortDescription'),
  );
  protected readonly categoryName = computed(() => {
    const category = this.machine().category;
    return category ? this.i18n.localize(category, 'name') : '';
  });
}
