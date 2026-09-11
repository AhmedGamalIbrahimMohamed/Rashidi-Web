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

export const LOCALES: readonly LocaleDefinition[] = [
  { code: 'en', label: 'English', short: 'EN', dir: 'ltr', tag: 'en' },
  { code: 'ar', label: 'العربية', short: 'ع', dir: 'rtl', tag: 'ar' },
] as const;

export const isLocale = (value: unknown): value is Locale => value === 'en' || value === 'ar';
