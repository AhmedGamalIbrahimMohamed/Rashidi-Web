import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CategoryService } from '../../core/services/category.service';
import { ContentService } from '../../core/services/content.service';
import { I18nService } from '../../core/services/i18n.service';
import { LogoComponent } from '../../shared/components/logo/logo.component';

@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LogoComponent],
  template: `
    <footer class="footer">
      <div class="footer__top shell">
        <div class="footer__brand">
          <a routerLink="/" [attr.aria-label]="i18n.dict().brand.full">
            <app-logo variant="mark" />
          </a>
          @if (footer()?.blurb) {
            <p class="footer__blurb">{{ footer()?.blurb }}</p>
          }
        </div>

        <nav class="footer__col" [attr.aria-label]="i18n.dict().footer.navigation">
          <h2 class="footer__heading">{{ i18n.dict().footer.navigation }}</h2>
          <a routerLink="/">{{ i18n.dict().nav.home }}</a>
          <a routerLink="/machines">{{ i18n.dict().nav.machinery }}</a>
          <a routerLink="/about">{{ i18n.dict().nav.about }}</a>
        </nav>

        @if (categories().length) {
          <nav class="footer__col" [attr.aria-label]="i18n.dict().machinery.title">
            <h2 class="footer__heading">{{ i18n.dict().machinery.title }}</h2>
            @for (category of categories(); track category.id) {
              <a [routerLink]="['/machines']" [queryParams]="{ category: category.slug }">
                {{ i18n.localize(category, 'name') }}
              </a>
            }
          </nav>
        }

        <div class="footer__col">
          <h2 class="footer__heading">{{ i18n.dict().footer.contact }}</h2>
          @if (contact()?.phone) {
            <a class="ltr" [href]="'tel:' + tel()">{{ contact()?.phone }}</a>
          }
          @if (contact()?.email) {
            <a [href]="'mailto:' + contact()?.email">{{ contact()?.email }}</a>
          }
          @if (contact()?.addressLine1) {
            <address class="footer__address">
              {{ contact()?.addressLine1 }}<br />{{ contact()?.addressLine2 }}
            </address>
          }

          @if (social().length) {
            <div class="footer__social">
              @for (link of social(); track link.url) {
                <a [href]="link.url" target="_blank" rel="noopener noreferrer">{{ link.platform }}</a>
              }
            </div>
          }
        </div>
      </div>

      <div class="footer__bar">
        <div class="shell footer__bar-inner">
          <p class="footer__copy">
            © {{ year }} {{ footer()?.copyright || i18n.dict().brand.full }}
          </p>
          <a class="footer__admin" routerLink="/admin">{{ i18n.dict().footer.admin }}</a>
        </div>
      </div>
    </footer>
  `,
  styles: `
    .footer {
      position: relative;
      margin-top: auto;
      background: linear-gradient(to bottom, var(--ink-1000), var(--ink-900));
      border-top: 1px solid var(--line);
    }

    .footer__top {
      display: grid;
      grid-template-columns: 1.6fr repeat(3, 1fr);
      gap: clamp(2rem, 5vw, 4rem);
      padding-block: clamp(3rem, 7vw, 5rem) clamp(2rem, 4vw, 3rem);
    }

    .footer__brand {
      --logo-h: 52px;
      --logo-name-size: 1.625rem;
      --logo-sub-size: 0.875rem;
      --logo-text-mobile: flex;
      display: flex;
      flex-direction: column;
      gap: 1.1rem;
      max-width: 34ch;
    }

    .footer__blurb {
      font-size: 0.875rem;
      line-height: 1.7;
      color: var(--text-mute);
    }

    .footer__col {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      font-size: 0.875rem;

      a {
        color: var(--text-mute);
        transition: color var(--dur-fast) var(--ease);
        width: fit-content;

        &:hover {
          color: var(--blue-bright);
        }
      }
    }

    /* A column label, so it should sit quieter than the links beneath it — but
       at 11px it was smaller than both the 14px links it heads and the site's
       own --fs-micro label size, which reads as an oversight rather than as
       hierarchy. Mono, uppercase, tracked and in --fg-strong keep it clearly a
       label at 13px, where it is actually comfortable to read. */
    .footer__heading {
      font-family: var(--font-mono);
      font-size: 0.8125rem;
      font-weight: 600;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: var(--fg-strong);
      margin-bottom: 0.5rem;
    }

    /* Arabic has no uppercase to set it apart and its letterforms carry less
       presence at a given size, so it takes another step up — and drops both
       the mono face and the tracking, neither of which a cursive script
       survives: JetBrains Mono has no Arabic, and spacing the letters apart
       breaks the joins between them.
       Uses :host-context rather than a plain "[dir='rtl'] &" descendant,
       because dir lives on <html> — outside this component. Emulated
       encapsulation stamps its scope attribute onto every compound selector,
       so the plain form compiles to
       [dir="rtl"][_ngcontent-x] .footer__heading[_ngcontent-x]
       and silently never matches anything. */
    :host-context([dir='rtl']) .footer__heading {
      font-family: var(--font-body);
      letter-spacing: 0.04em;
      font-size: 0.9375rem;
    }

    .footer__address {
      font-style: normal;
      color: var(--text-mute);
      line-height: 1.7;
    }

    .footer__social {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem 1rem;
      margin-top: 0.5rem;
    }

    .footer__bar {
      border-top: 1px solid var(--line);
    }

    .footer__bar-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding-block: 1.35rem;
    }

    .footer__copy {
      font-size: 0.8125rem;
      color: var(--text-mute);
    }

    .footer__admin {
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--ink-400);
      transition: color var(--dur-fast) var(--ease);

      &:hover {
        color: var(--blue);
      }
    }

    @media (max-width: 900px) {
      .footer__top {
        grid-template-columns: 1fr 1fr;
      }

      .footer__brand {
        grid-column: 1 / -1;
      }
    }

    @media (max-width: 560px) {
      .footer__top {
        grid-template-columns: 1fr;
      }

      .footer__bar-inner {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.6rem;
      }
    }
  `,
})
export class FooterComponent {
  protected readonly i18n = inject(I18nService);
  private readonly content = inject(ContentService);
  private readonly categoryService = inject(CategoryService);

  protected readonly year = new Date().getFullYear();

  protected readonly footer = this.content.footer;
  protected readonly contact = this.content.contact;
  protected readonly social = this.content.social;

  /** First six categories only — the footer is navigation, not a full index. */
  protected readonly categories = computed(() => this.categoryService.categories().slice(0, 6));

  /** Strips spaces so `tel:` works on every handset. */
  protected readonly tel = computed(() => (this.contact()?.phone ?? '').replace(/[^\d+]/g, ''));
}
