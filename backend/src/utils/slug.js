import { prisma } from '../lib/prisma.js';

const ARABIC_RANGE = /[\u0600-\u06FF]/;

/**
 * Converts a title into a URL segment. Latin text is transliterated to
 * lowercase ASCII; Arabic-only titles keep their characters (browsers and
 * search engines handle percent-encoded UTF-8 slugs fine) so the admin can
 * still publish a machine that only has an Arabic name.
 */
export function slugify(input) {
  if (!input) return '';

  const normalised = String(input)
    .normalize('NFKD')
    // Strip combining marks only for Latin text; Arabic diacritics are handled below.
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

  const cleaned = ARABIC_RANGE.test(normalised)
    ? normalised
        // Remove Arabic diacritics (tashkeel) and tatweel.
        .replace(/[\u064B-\u0652\u0640]/g, '')
        .replace(/[^\u0621-\u064A0-9a-z\s-]/g, '')
    : normalised.replace(/[^a-z0-9\s-]/g, '');

  return cleaned.replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90);
}

/**
 * Returns a slug that is free in `model`, appending -2, -3, … on collision.
 * `excludeId` lets an update keep its own slug.
 */
export async function uniqueSlug(model, source, excludeId = null) {
  const base = slugify(source) || 'item';
  let candidate = base;

  for (let suffix = 2; suffix < 200; suffix += 1) {
    const existing = await prisma[model].findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) return candidate;
    candidate = `${base}-${suffix}`;
  }

  return `${base}-${Date.now()}`;
}
