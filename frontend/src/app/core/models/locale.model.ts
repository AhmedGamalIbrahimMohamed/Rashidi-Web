export type Locale = 'en' | 'ar';

export type Direction = 'ltr' | 'rtl';

export interface LocaleDefinition {
  code: Locale;
  /** Name shown in the switcher, written in its own language. */
  label: string;
  /** Two-letter badge used in the compact switcher. */
  short: string;
  dir: Direction;
  /** BCP-47 tag for Intl formatting and the <html lang> attribute. */
  tag: string;
}

/** Arabic first — it is the site's default, and LOCALES[0] is the fallback definition. */
export const LOCALES: readonly LocaleDefinition[] = [
  { code: 'ar', label: 'العربية', short: 'ع', dir: 'rtl', tag: 'ar' },
  { code: 'en', label: 'English', short: 'EN', dir: 'ltr', tag: 'en' },
] as const;

export const isLocale = (value: unknown): value is Locale => value === 'en' || value === 'ar';
