import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../core/services/i18n.service';
import { SeoService } from '../../core/services/seo.service';

@Component({
  selector: 'app-not-found',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <section class="nf">
      <div class="grid-bg" aria-hidden="true"></div>

      <div class="shell nf__inner">
        <p class="nf__code" aria-hidden="true">{{ i18n.dict().notFound.code }}</p>
        <h1 class="nf__title">{{ i18n.dict().notFound.title }}</h1>
        <p class="nf__body">{{ i18n.dict().notFound.body }}</p>

        <div class="nf__actions">
          <a class="btn btn--primary" routerLink="/">{{ i18n.dict().notFound.home }}</a>
          <a class="btn btn--ghost" routerLink="/machines">{{ i18n.dict().notFound.machinery }}</a>
        </div>
      </div>
    </section>
  `,
  styles: `
    .nf {
      position: relative;
      overflow: hidden;
      min-height: 70vh;
      display: grid;
      place-items: center;
      background:
        radial-gradient(ellipse 60% 70% at 50% 40%, rgba(0, 123, 255, 0.12), transparent 68%),
        var(--ink-1000);
    }

    .nf__inner {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding-block: clamp(4rem, 12vw, 8rem);
      text-align: center;
    }

    .nf__code {
      font-family: var(--font-display);
      font-size: clamp(5rem, 18vw, 11rem);
      font-weight: 700;
      line-height: 0.85;
      letter-spacing: -0.05em;
      background: linear-gradient(160deg, var(--ink-500), var(--ink-700));
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }

    .nf__title {
      font-size: var(--fs-h2);
    }

    .nf__body {
      max-width: 44ch;
      color: var(--text-mute);
    }

    .nf__actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.7rem;
      margin-top: 0.6rem;
    }
  `,
})
export class NotFoundComponent {
  protected readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.apply({
      title: this.i18n.dict().notFound.title,
      description: this.i18n.dict().notFound.body,
      noIndex: true,
    });
  }
}
