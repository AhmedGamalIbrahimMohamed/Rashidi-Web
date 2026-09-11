import { Locale } from './locale.model';

/** A content block as stored: the same shape in both languages. */
export interface LocalizedValue<T = unknown> {
  en: T;
  ar: T;
}

/** GET /api/content returns a flat map so a language switch needs no refetch. */
export type ContentMap = Record<string, LocalizedValue>;

/** Row metadata the dashboard needs to render its editor. */
export interface ContentBlock {
  key: string;
  group: string;
  labelEn: string | null;
  labelAr: string | null;
  valueEn: unknown;
  valueAr: unknown;
  sortOrder: number;
  updatedAt: string;
}

export interface ContentPayload {
  key: string;
  group?: string | null;
  labelEn?: string | null;
  labelAr?: string | null;
  valueEn: unknown;
  valueAr: unknown;
  sortOrder?: number;
}

// --- Typed shapes for the blocks the website reads --------------------------
// These mirror what the seed writes. Every field is optional at the type level
// because an admin can clear anything from the dashboard, and the templates
// fall back rather than render "undefined".

export interface HeroContent {
  eyebrow?: string;
  headlineLine1?: string;
  headlineLine2?: string;
  description?: string;
  primaryCta?: string;
  secondaryCta?: string;
}

export interface StatItem {
  value?: string;
  label?: string;
}

export interface CapabilityItem {
  index?: string;
  title?: string;
  body?: string;
}

export interface CapabilitiesContent {
  title?: string;
  subtitle?: string;
  items?: CapabilityItem[];
}

export interface AboutValue {
  title?: string;
  body?: string;
}

export interface AboutContent {
  eyebrow?: string;
  title?: string;
  lead?: string;
  paragraphs?: string[];
  values?: AboutValue[];
}

export interface ContactDetails {
  eyebrow?: string;
  title?: string;
  lead?: string;
  phone?: string;
  phoneSecondary?: string;
  whatsapp?: string;
  email?: string;
  salesEmail?: string;
  addressLine1?: string;
  addressLine2?: string;
  mapUrl?: string;
  workingHours?: string;
  formCta?: string;
}

export interface SocialLink {
  platform?: string;
  url?: string;
}

export interface SiteMeta {
  siteName?: string;
  tagline?: string;
  defaultTitle?: string;
  defaultDescription?: string;
}

export interface FooterContent {
  blurb?: string;
  copyright?: string;
}

/** Keys the website reads. Collected here so a rename is a compile error. */
export const CONTENT_KEYS = {
  hero: 'home.hero',
  stats: 'home.stats',
  capabilities: 'home.capabilities',
  about: 'about.main',
  contact: 'contact.details',
  social: 'contact.social',
  siteMeta: 'site.meta',
  footer: 'footer.main',
} as const;

export type ContentKey = (typeof CONTENT_KEYS)[keyof typeof CONTENT_KEYS];

/** Narrows a stored block to the active locale. */
export function resolveContent<T>(value: LocalizedValue | undefined, locale: Locale): T | null {
  if (!value) return null;
  return (value[locale] ?? value.en ?? null) as T | null;
}
