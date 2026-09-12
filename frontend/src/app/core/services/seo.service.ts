import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
import { Locale } from '../models/locale.model';
import { I18nService } from './i18n.service';

export interface PageSeo {
  title: string;
  description?: string;
  /** Absolute or root-relative image URL for social cards. */
  image?: string;
  /** Path without origin, e.g. `/machines/pet-blow-molder`. */
  path?: string;
  type?: 'website' | 'article' | 'product';
  /** Keeps a page out of search results (admin, 404). */
  noIndex?: boolean;
  /** JSON-LD payload injected as a <script type="application/ld+json">. */
  structuredData?: Record<string, unknown>;
}

const SUFFIX = {
  en: 'Rashidi Import & Export',
  ar: 'الراشيدي للاستيراد والتصدير',
} as const satisfies Record<Locale, string>;

/**
 * Per-route document head management.
 *
 * The app renders client-side, so this runs after hydration — which is fine for
 * Google (it executes JS) and for the social crawlers that matter here, because
 * the tags are in place before the page settles. If link-preview unfurling for
 * Facebook/WhatsApp becomes a requirement, add Angular SSR and this service
 * keeps working unchanged.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly i18n = inject(I18nService);

  private readonly origin = environment.siteUrl.replace(/\/$/, '');

  apply(seo: PageSeo): void {
    const locale = this.i18n.locale();
    const fullTitle = seo.title.includes(SUFFIX[locale])
      ? seo.title
      : `${seo.title} — ${SUFFIX[locale]}`;

    this.title.setTitle(fullTitle);

    const url = seo.path ? `${this.origin}${seo.path}` : this.document.location?.href;
    const image = this.absolute(seo.image ?? '/og-image.png');

    this.setName('description', seo.description);
    this.setName('robots', seo.noIndex ? 'noindex, nofollow' : 'index, follow');

    this.setProperty('og:title', fullTitle);
    this.setProperty('og:description', seo.description);
    this.setProperty('og:type', seo.type ?? 'website');
    this.setProperty('og:url', url);
    this.setProperty('og:image', image);
    this.setProperty('og:locale', locale === 'ar' ? 'ar_AE' : 'en_US');
    this.setProperty('og:locale:alternate', locale === 'ar' ? 'en_US' : 'ar_AE');

    this.setName('twitter:card', 'summary_large_image');
    this.setName('twitter:title', fullTitle);
    this.setName('twitter:description', seo.description);
    this.setName('twitter:image', image);

    if (url) this.setCanonical(url);
    this.setStructuredData(seo.structuredData);
  }

  /** Trims a description to a length search engines will actually show. */
  static truncate(text: string | null | undefined, max = 155): string {
    if (!text) return '';
    const clean = text.replace(/\s+/g, ' ').trim();
    if (clean.length <= max) return clean;
    return `${clean.slice(0, clean.lastIndexOf(' ', max - 1))}…`;
  }

  /** Organisation markup, emitted on the home page. */
  organisationSchema(details: {
    phone?: string;
    email?: string;
    address?: string;
    sameAs?: string[];
  }): Record<string, unknown> {
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Rashidi Import & Export',
      alternateName: 'الراشيدي للاستيراد والتصدير',
      url: this.origin,
      logo: this.absolute('/logo.png'),
      description:
        'Import, export and supply of plastic processing machinery and heavy industrial equipment.',
      ...(details.phone
        ? {
            contactPoint: {
              '@type': 'ContactPoint',
              telephone: details.phone,
              contactType: 'sales',
              email: details.email,
              availableLanguage: ['English', 'Arabic'],
            },
          }
        : {}),
      ...(details.address
        ? { address: { '@type': 'PostalAddress', streetAddress: details.address } }
        : {}),
      ...(details.sameAs?.length ? { sameAs: details.sameAs } : {}),
    };
  }

  /** Product markup for a machine details page. */
  machineSchema(machine: {
    name: string;
    description: string;
    image?: string;
    brand?: string | null;
    sku?: string;
    available: boolean;
    path: string;
  }): Record<string, unknown> {
    return {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: machine.name,
      description: machine.description,
      ...(machine.image ? { image: this.absolute(machine.image) } : {}),
      ...(machine.brand ? { brand: { '@type': 'Brand', name: machine.brand } } : {}),
      ...(machine.sku ? { sku: machine.sku } : {}),
      category: 'Industrial Machinery',
      offers: {
        '@type': 'Offer',
        url: `${this.origin}${machine.path}`,
        availability: machine.available
          ? 'https://schema.org/InStock'
          : 'https://schema.org/SoldOut',
        // Price is quoted per enquiry — no priceSpecification is emitted rather
        // than publishing a placeholder number.
        seller: { '@type': 'Organization', name: 'Rashidi Import & Export' },
      },
    };
  }

  // --- internals ------------------------------------------------------------

  private absolute(path: string): string {
    if (!path) return '';
    if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path;
    return `${this.origin}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  private setName(name: string, content: string | undefined): void {
    if (content) this.meta.updateTag({ name, content });
    else this.meta.removeTag(`name='${name}'`);
  }

  private setProperty(property: string, content: string | undefined): void {
    if (content) this.meta.updateTag({ property, content });
    else this.meta.removeTag(`property='${property}'`);
  }

  private setCanonical(url: string): void {
    let link = this.document.querySelector<HTMLLinkElement>("link[rel='canonical']");
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url.split('?')[0]);
  }

  private setStructuredData(data: Record<string, unknown> | undefined): void {
    const id = 'rashidi-structured-data';
    this.document.getElementById(id)?.remove();
    if (!data) return;

    const script = this.document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data);
    this.document.head.appendChild(script);
  }
}
