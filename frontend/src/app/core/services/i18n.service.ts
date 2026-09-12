import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { en } from '../i18n/en';
import { ar } from '../i18n/ar';
import { Direction, LOCALES, Locale, LocaleDefinition, isLocale } from '../models/locale.model';

const DICTIONARIES = { en, ar } as const;

/**
 * Dot-separated paths into the translation tree, derived from the English
 * dictionary. A typo in a template key is a compile error, not a blank label.
 */
type Leaves<T> = T extends string
  ? ''
  : {
      [K in keyof T & string]: T[K] extends string ? K : `${K}.${Leaves<T[K]>}`;
    }[keyof T & string];

export type TranslationKey = Leaves<typeof en>;

/**
 * Language state for the whole application.
 *
 * Translations are held in memory, so switching language is synchronous — no
 * request, no flash of untranslated content. The service also owns the
 * document-level side effects (`lang`, `dir`) that make RTL work natively:
 * once `dir="rtl"` is on <html>, every logical CSS property in the stylesheet
 * mirrors itself, which is why the layout does not need a parallel RTL sheet.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly document = inject(DOCUMENT);

  private readonly _locale = signal<Locale>(this.readInitialLocale());

  readonly locale = this._locale.asReadonly();

  readonly direction = computed<Direction>(() => (this._locale() === 'ar' ? 'rtl' : 'ltr'));

  readonly isRtl = computed(() => this.direction() === 'rtl');

  readonly definition = computed<LocaleDefinition>(
    () => LOCALES.find((item) => item.code === this._locale()) ?? LOCALES[0],
  );

  /** The locale the switcher would move to — there are exactly two. */
  readonly alternate = computed<LocaleDefinition>(
    () => LOCALES.find((item) => item.code !== this._locale()) ?? LOCALES[1],
  );

  readonly locales = LOCALES;

  /**
   * The active dictionary as a signal, so templates can read
   * `i18n.dict().nav.home` and re-render automatically on a language change.
   */
  readonly dict = computed(() => DICTIONARIES[this._locale()]);

  constructor() {
    this.applyToDocument(this._locale());
  }

  /**
   * Resolves a dot path to a string. Falls back to English, then to the key
   * itself, so a missing translation degrades to something readable.
   */
  t(key: TranslationKey): string {
    const fromActive = this.lookup(DICTIONARIES[this._locale()], key);
    if (fromActive !== null) return fromActive;

    const fromEnglish = this.lookup(en, key);
    return fromEnglish ?? key;
  }

  setLocale(locale: Locale): void {
    if (locale === this._locale()) return;
    this._locale.set(locale);
    this.persist(locale);
    this.applyToDocument(locale);
  }

  toggle(): void {
    this.setLocale(this.alternate().code);
  }

  /**
   * Picks the right column from a bilingual API record:
   * `localize(machine, 'name')` reads `nameAr` in Arabic, `nameEn` otherwise,
   * and falls back to the other language when one side is empty — a machine
   * with only an English description still shows something in Arabic.
   */
  localize<T extends object>(record: T | null | undefined, field: string): string {
    if (!record) return '';

    const suffixed = (suffix: 'En' | 'Ar') =>
      (record as Record<string, unknown>)[`${field}${suffix}`];

    const preferred = this._locale() === 'ar' ? suffixed('Ar') : suffixed('En');
    if (typeof preferred === 'string' && preferred.trim()) return preferred;

    const fallback = this._locale() === 'ar' ? suffixed('En') : suffixed('Ar');
    return typeof fallback === 'string' ? fallback : '';
  }

  /** Locale-aware number formatting — Arabic renders Arabic-Indic digits. */
  formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(this.definition().tag, options).format(value);
  }

  /**
   * Years must not be grouped — a machine built in 2021 is not "2,021".
   * Still goes through Intl so Arabic gets Arabic-Indic digits.
   */
  formatYear(value: number): string {
    return this.formatNumber(value, { useGrouping: false });
  }

  formatDate(value: string | Date, options?: Intl.DateTimeFormatOptions): string {
    const date = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(this.definition().tag, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      ...options,
    }).format(date);
  }

  // --- internals ------------------------------------------------------------

  private lookup(dictionary: unknown, key: string): string | null {
    let current: unknown = dictionary;

    for (const segment of key.split('.')) {
      if (current === null || typeof current !== 'object') return null;
      current = (current as Record<string, unknown>)[segment];
    }

    return typeof current === 'string' ? current : null;
  }

  /**
   * Preference order: an explicit past choice, then the browser's languages,
   * then the configured default. The site is English-first by design, so an
   * Arabic browser gets Arabic only if English is not also acceptable.
   */
  private readInitialLocale(): Locale {
    const stored = this.safeRead(environment.i18n.storageKey);
    if (isLocale(stored)) return stored;

    const browserLanguages = this.document.defaultView?.navigator?.languages ?? [];
    for (const language of browserLanguages) {
      const base = language.toLowerCase().split('-')[0];
      if (base === 'en') return 'en';
      if (base === 'ar') return 'ar';
    }

    return environment.i18n.defaultLocale;
  }

  private applyToDocument(locale: Locale): void {
    const definition = LOCALES.find((item) => item.code === locale) ?? LOCALES[0];
    const root = this.document.documentElement;
    root.setAttribute('lang', definition.tag);
    root.setAttribute('dir', definition.dir);
  }

  private persist(locale: Locale): void {
    try {
      this.document.defaultView?.localStorage.setItem(environment.i18n.storageKey, locale);
    } catch {
      // Private mode or blocked storage — the choice simply does not survive a reload.
    }
  }

  private safeRead(key: string): string | null {
    try {
      return this.document.defaultView?.localStorage.getItem(key) ?? null;
    } catch {
      return null;
    }
  }
}
