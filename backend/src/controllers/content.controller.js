import { prisma } from '../lib/prisma.js';
import { processMachineImage } from '../lib/image-processor.js';
import { ApiError, asyncHandler } from '../utils/errors.js';

/**
 * Site copy is served as a flat `{ key: { en, ar } }` map. The frontend reads
 * it once at bootstrap and resolves the active language client-side, which
 * keeps a language switch instant — no second round trip.
 */
const toMap = (rows) =>
  rows.reduce((accumulator, row) => {
    accumulator[row.key] = { en: row.valueEn, ar: row.valueAr };
    return accumulator;
  }, {});

/** GET /api/content — optional ?group=about */
export const getContent = asyncHandler(async (req, res) => {
  const group = typeof req.query.group === 'string' ? req.query.group : undefined;

  const rows = await prisma.siteContent.findMany({
    where: group ? { group } : {},
    orderBy: [{ group: 'asc' }, { sortOrder: 'asc' }],
  });

  res.json({
    success: true,
    data: toMap(rows),
    // The raw rows carry labels and grouping the dashboard needs to build its form.
    meta: { blocks: rows },
  });
});

/** GET /api/content/:key */
export const getContentBlock = asyncHandler(async (req, res) => {
  const row = await prisma.siteContent.findUnique({ where: { key: req.params.key } });
  if (!row) throw ApiError.notFound('Content block not found');
  res.json({ success: true, data: { en: row.valueEn, ar: row.valueAr }, meta: { block: row } });
});

/**
 * PUT /api/content
 * Accepts one block or a batch, and upserts so the admin never has to think
 * about whether a key already exists.
 */
export const upsertContent = asyncHandler(async (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [req.body];

  const saved = await prisma.$transaction(
    items.map((item) =>
      prisma.siteContent.upsert({
        where: { key: item.key },
        create: {
          key: item.key,
          group: item.group ?? 'general',
          labelEn: item.labelEn ?? null,
          labelAr: item.labelAr ?? null,
          valueEn: item.valueEn,
          valueAr: item.valueAr,
          sortOrder: item.sortOrder ?? 0,
        },
        update: {
          ...(item.group !== undefined && item.group !== null ? { group: item.group } : {}),
          ...(item.labelEn !== undefined ? { labelEn: item.labelEn } : {}),
          ...(item.labelAr !== undefined ? { labelAr: item.labelAr } : {}),
          valueEn: item.valueEn,
          valueAr: item.valueAr,
          ...(item.sortOrder !== undefined ? { sortOrder: item.sortOrder } : {}),
        },
      }),
    ),
  );

  res.json({ success: true, data: toMap(saved), meta: { blocks: saved } });
});

/** DELETE /api/content/:key */
export const deleteContent = asyncHandler(async (req, res) => {
  await prisma.siteContent.delete({ where: { key: req.params.key } });
  res.json({ success: true, data: { key: req.params.key, message: 'Content block deleted' } });
});

/**
 * POST /api/content/media — multipart, field name `image`
 * Generic image upload for content blocks (About hero, category art, OG image).
 * Returns the URLs; the admin then stores them inside whichever block needs them.
 */
export const uploadContentImage = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No image was received');
  const image = await processMachineImage(req.file, 'content');
  res.status(201).json({ success: true, data: image });
});
