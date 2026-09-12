import { z } from 'zod';

/**
 * Every request shape in one file. Zod does the coercion (query strings are
 * always text) and the trimming, so controllers can trust what they receive.
 */

const trimmed = (max, label = 'Value') =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer`);

const requiredText = (max, label) => trimmed(max, label).min(1, `${label} is required`);

/** Optional text that turns '' into null so the column is cleared, not blanked. */
const optionalText = (max, label = 'Value') =>
  trimmed(max, label)
    .optional()
    .nullable()
    .transform((value) => (value === '' || value === undefined ? null : value));

/**
 * Multipart bodies arrive as strings, so nested arrays are sent JSON-encoded.
 * This accepts either a real array (JSON request) or its string form.
 */
const jsonArray = (schema, max) =>
  z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }, z.array(schema).max(max, `Send at most ${max} entries`));

const booleanish = z.preprocess((value) => {
  if (typeof value === 'string') return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
  return value;
}, z.boolean());

export const MACHINE_STATUSES = ['AVAILABLE', 'IN_STOCK', 'SOLD'];

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(10, 'New password must be at least 10 characters')
      .max(128, 'New password is too long'),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must differ from the current one',
    path: ['newPassword'],
  });

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export const categoryCreateSchema = z.object({
  slug: optionalText(90, 'Slug'),
  nameEn: requiredText(120, 'English name'),
  nameAr: requiredText(120, 'Arabic name'),
  descriptionEn: optionalText(600, 'English description'),
  descriptionAr: optionalText(600, 'Arabic description'),
  imageUrl: optionalText(600, 'Image URL'),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
});

export const categoryUpdateSchema = categoryCreateSchema.partial();

// ---------------------------------------------------------------------------
// Machines
// ---------------------------------------------------------------------------

const specificationSchema = z.object({
  id: z.string().optional(),
  labelEn: requiredText(120, 'Specification label (EN)'),
  labelAr: requiredText(120, 'Specification label (AR)'),
  valueEn: requiredText(240, 'Specification value (EN)'),
  valueAr: requiredText(240, 'Specification value (AR)'),
  groupEn: optionalText(120, 'Specification group (EN)'),
  groupAr: optionalText(120, 'Specification group (AR)'),
  sortOrder: z.coerce.number().int().min(0).max(999).optional(),
});

export const machineCreateSchema = z.object({
  slug: optionalText(90, 'Slug'),
  nameEn: requiredText(160, 'English name'),
  nameAr: requiredText(160, 'Arabic name'),
  shortDescriptionEn: optionalText(300, 'English summary'),
  shortDescriptionAr: optionalText(300, 'Arabic summary'),
  descriptionEn: optionalText(8000, 'English description'),
  descriptionAr: optionalText(8000, 'Arabic description'),
  technicalInfoEn: optionalText(8000, 'English technical information'),
  technicalInfoAr: optionalText(8000, 'Arabic technical information'),

  status: z.enum(MACHINE_STATUSES).optional(),

  brand: optionalText(120, 'Brand'),
  modelNumber: optionalText(120, 'Model'),
  manufactureYear: z.coerce
    .number()
    .int()
    .min(1900, 'Year looks too early')
    .max(new Date().getFullYear() + 2, 'Year looks too far ahead')
    .optional()
    .nullable(),
  countryOfOrigin: optionalText(120, 'Country of origin'),
  condition: optionalText(120, 'Condition'),

  isFeatured: booleanish.optional(),
  isPublished: booleanish.optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),

  metaTitleEn: optionalText(180, 'Meta title (EN)'),
  metaTitleAr: optionalText(180, 'Meta title (AR)'),
  metaDescriptionEn: optionalText(320, 'Meta description (EN)'),
  metaDescriptionAr: optionalText(320, 'Meta description (AR)'),

  categoryId: optionalText(60, 'Category'),
  specifications: jsonArray(specificationSchema, 80).optional(),
});

export const machineUpdateSchema = machineCreateSchema.partial();

export const machineQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(60).default(12),
  search: trimmed(120).optional(),
  category: trimmed(90).optional(),
  status: z.enum(MACHINE_STATUSES).optional(),
  featured: z.enum(['true', 'false']).optional(),
  sort: z.enum(['newest', 'oldest', 'name', 'popular', 'manual']).default('manual'),
  // Admin-only: include drafts. Ignored for anonymous callers.
  includeUnpublished: z.enum(['true', 'false']).optional(),
});

export const imageUpdateSchema = z.object({
  altEn: optionalText(240, 'Alt text (EN)'),
  altAr: optionalText(240, 'Alt text (AR)'),
  isMain: booleanish.optional(),
  sortOrder: z.coerce.number().int().min(0).max(999).optional(),
});

export const imageReorderSchema = z.object({
  order: z.array(z.string().min(1)).min(1, 'Provide the image ids in their new order'),
});


// ---------------------------------------------------------------------------
// Contact
// ---------------------------------------------------------------------------

export const contactSchema = z.object({
  name: requiredText(120, 'Name'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  phone: optionalText(40, 'Phone'),
  subject: requiredText(180, 'Subject'),
  message: requiredText(4000, 'Message').pipe(z.string().min(10, 'Message is too short')),
  machineId: optionalText(60, 'Machine'),
  locale: z.enum(['en', 'ar']).default('en'),
  /**
   * Honeypot. Accepted rather than rejected here on purpose: the controller
   * answers a filled-in trap with a normal success response and simply drops
   * the message, so a bot learns nothing about why it failed.
   */
  website: z.string().max(200).optional(),
});

export const contactQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['NEW', 'READ', 'REPLIED', 'ARCHIVED']).optional(),
  search: trimmed(120).optional(),
});

export const contactStatusSchema = z.object({
  status: z.enum(['NEW', 'READ', 'REPLIED', 'ARCHIVED']),
});

// ---------------------------------------------------------------------------
// Site content
// ---------------------------------------------------------------------------

const contentValue = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.record(z.any()),
  z.array(z.any()),
]);

export const contentUpsertSchema = z.object({
  key: requiredText(80, 'Content key').regex(
    /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/i,
    'Key may contain letters, numbers, dots, dashes and underscores',
  ),
  group: optionalText(40, 'Group'),
  labelEn: optionalText(120, 'Label (EN)'),
  labelAr: optionalText(120, 'Label (AR)'),
  valueEn: contentValue,
  valueAr: contentValue,
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
});

export const contentBulkSchema = z.object({
  items: z.array(contentUpsertSchema).min(1, 'Send at least one content block').max(200),
});

export const idParamSchema = z.object({ id: z.string().min(1) });
