import { prisma } from '../lib/prisma.js';
import { storage } from '../lib/storage/index.js';
import { processMachineImage, storeDocument } from '../lib/image-processor.js';
import { ApiError, asyncHandler } from '../utils/errors.js';
import { uniqueSlug } from '../utils/slug.js';

/** Shape returned for a single machine — images and specs already ordered. */
const detailInclude = {
  category: true,
  images: { orderBy: [{ isMain: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }] },
  specifications: { orderBy: [{ sortOrder: 'asc' }] },
  documents: { orderBy: [{ sortOrder: 'asc' }] },
};

/** Lighter shape for the catalogue grid — only the card image travels. */
const listInclude = {
  category: { select: { id: true, slug: true, nameEn: true, nameAr: true } },
  images: {
    orderBy: [{ isMain: 'desc' }, { sortOrder: 'asc' }],
    take: 1,
  },
  _count: { select: { images: true } },
};

const ORDER_BY = {
  newest: [{ createdAt: 'desc' }],
  oldest: [{ createdAt: 'asc' }],
  name: [{ nameEn: 'asc' }],
  popular: [{ viewCount: 'desc' }, { createdAt: 'desc' }],
  manual: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
};

/**
 * Scalar fields an admin may write. Keeping this explicit stops a crafted
 * payload from reaching columns like `viewCount` through mass assignment.
 */
const WRITABLE_FIELDS = [
  'nameEn', 'nameAr',
  'shortDescriptionEn', 'shortDescriptionAr',
  'descriptionEn', 'descriptionAr',
  'technicalInfoEn', 'technicalInfoAr',
  'status', 'brand', 'modelNumber', 'manufactureYear', 'countryOfOrigin', 'condition',
  'isFeatured', 'isPublished', 'sortOrder',
  'metaTitleEn', 'metaTitleAr', 'metaDescriptionEn', 'metaDescriptionAr',
];

const pickWritable = (body) =>
  Object.fromEntries(
    Object.entries(body).filter(([key, value]) => WRITABLE_FIELDS.includes(key) && value !== undefined),
  );

async function assertCategoryExists(categoryId) {
  if (!categoryId) return null;
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });
  if (!category) throw ApiError.badRequest('The selected category does not exist');
  return categoryId;
}

// ---------------------------------------------------------------------------
// Public reads
// ---------------------------------------------------------------------------

/** GET /api/machines */
export const listMachines = asyncHandler(async (req, res) => {
  const query = req.validatedQuery;
  const isStaff = Boolean(req.user);
  const showDrafts = isStaff && query.includeUnpublished === 'true';

  const where = {
    ...(showDrafts ? {} : { isPublished: true }),
    ...(query.status ? { status: query.status } : {}),
    ...(query.featured === 'true' ? { isFeatured: true } : {}),
    ...(query.category
      ? { category: { OR: [{ slug: query.category }, { id: query.category }] } }
      : {}),
    ...(query.search
      ? {
          OR: [
            { nameEn: { contains: query.search } },
            { nameAr: { contains: query.search } },
            { brand: { contains: query.search } },
            { modelNumber: { contains: query.search } },
            { shortDescriptionEn: { contains: query.search } },
            { shortDescriptionAr: { contains: query.search } },
          ],
        }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.machine.count({ where }),
    prisma.machine.findMany({
      where,
      include: listInclude,
      orderBy: ORDER_BY[query.sort] ?? ORDER_BY.manual,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  res.json({
    success: true,
    data: items,
    meta: {
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
  });
});

/**
 * GET /api/machines/:id
 * `:id` accepts either the cuid or the SEO slug, so /machines/plastic-injection
 * -molding-machine resolves without an extra lookup endpoint.
 */
export const getMachine = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const machine = await prisma.machine.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    include: detailInclude,
  });

  if (!machine) throw ApiError.notFound('Machine not found');
  if (!machine.isPublished && !req.user) throw ApiError.notFound('Machine not found');

  // Fire-and-forget: a failed counter must never break the page.
  prisma.machine
    .update({ where: { id: machine.id }, data: { viewCount: { increment: 1 } } })
    .catch(() => {});

  // Surface a few siblings for the "related machinery" strip.
  const related = await prisma.machine.findMany({
    where: {
      id: { not: machine.id },
      isPublished: true,
      ...(machine.categoryId ? { categoryId: machine.categoryId } : {}),
    },
    include: listInclude,
    orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }],
    take: 3,
  });

  res.json({ success: true, data: { ...machine, related } });
});

// ---------------------------------------------------------------------------
// Admin writes
// ---------------------------------------------------------------------------

/** POST /api/machines */
export const createMachine = asyncHandler(async (req, res) => {
  const { slug, categoryId, specifications, ...rest } = req.body;

  await assertCategoryExists(categoryId);
  const finalSlug = await uniqueSlug('machine', slug || rest.nameEn || rest.nameAr);

  const machine = await prisma.machine.create({
    data: {
      ...pickWritable(rest),
      slug: finalSlug,
      ...(categoryId ? { category: { connect: { id: categoryId } } } : {}),
      ...(specifications?.length
        ? {
            specifications: {
              create: specifications.map((spec, index) => ({
                labelEn: spec.labelEn,
                labelAr: spec.labelAr,
                valueEn: spec.valueEn,
                valueAr: spec.valueAr,
                groupEn: spec.groupEn ?? null,
                groupAr: spec.groupAr ?? null,
                sortOrder: spec.sortOrder ?? index,
              })),
            },
          }
        : {}),
    },
    include: detailInclude,
  });

  res.status(201).json({ success: true, data: machine });
});

/** PUT /api/machines/:id */
export const updateMachine = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { slug, categoryId, specifications, ...rest } = req.body;

  const existing = await prisma.machine.findUnique({ where: { id }, select: { id: true, slug: true } });
  if (!existing) throw ApiError.notFound('Machine not found');

  if (categoryId !== undefined) await assertCategoryExists(categoryId);

  const data = pickWritable(rest);

  if (slug && slug !== existing.slug) {
    data.slug = await uniqueSlug('machine', slug, id);
  }

  if (categoryId !== undefined) {
    data.category = categoryId ? { connect: { id: categoryId } } : { disconnect: true };
  }

  // Specifications are sent as the complete desired list; replacing them in a
  // transaction keeps ordering and deletions consistent in one round trip.
  if (specifications !== undefined) {
    data.specifications = {
      deleteMany: {},
      create: specifications.map((spec, index) => ({
        labelEn: spec.labelEn,
        labelAr: spec.labelAr,
        valueEn: spec.valueEn,
        valueAr: spec.valueAr,
        groupEn: spec.groupEn ?? null,
        groupAr: spec.groupAr ?? null,
        sortOrder: spec.sortOrder ?? index,
      })),
    };
  }

  const machine = await prisma.machine.update({ where: { id }, data, include: detailInclude });
  res.json({ success: true, data: machine });
});

/** DELETE /api/machines/:id */
export const deleteMachine = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const machine = await prisma.machine.findUnique({
    where: { id },
    include: { images: true, documents: true },
  });
  if (!machine) throw ApiError.notFound('Machine not found');

  // Remove the DB rows first: an orphaned file is recoverable, a row pointing
  // at a deleted file is not. Cascades clear images/specs/documents.
  await prisma.machine.delete({ where: { id } });

  await Promise.allSettled([
    ...machine.images.flatMap((image) => [
      storage.delete(image.storageKey),
      // Thumbnails follow the `-thumb` suffix convention from the processor.
      storage.delete(image.storageKey.replace(/\.webp$/, '-thumb.webp')),
    ]),
    ...machine.documents.map((document) => storage.delete(document.storageKey)),
  ]);

  res.json({ success: true, data: { id, message: 'Machine deleted' } });
});

/** PATCH /api/machines/:id/status */
export const updateStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const machine = await prisma.machine.update({
    where: { id },
    data: { status: req.body.status },
    include: detailInclude,
  });
  res.json({ success: true, data: machine });
});

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

/** POST /api/machines/:id/images — multipart, field name `images` */
export const addImages = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const machine = await prisma.machine.findUnique({
    where: { id },
    select: { id: true, _count: { select: { images: true } } },
  });
  if (!machine) throw ApiError.notFound('Machine not found');
  if (!req.files?.length) throw ApiError.badRequest('No image files were received');

  const existingCount = machine._count.images;

  const processed = await Promise.all(
    req.files.map((file) => processMachineImage(file, `machines/${id}`)),
  );

  const created = await prisma.$transaction(
    processed.map((image, index) =>
      prisma.machineImage.create({
        data: {
          machineId: id,
          url: image.url,
          storageKey: image.storageKey,
          thumbnailUrl: image.thumbnailUrl,
          width: image.width,
          height: image.height,
          blurDataUrl: image.blurDataUrl,
          // The very first image uploaded becomes the card/hero image.
          isMain: existingCount === 0 && index === 0,
          sortOrder: existingCount + index,
        },
      }),
    ),
  );

  res.status(201).json({ success: true, data: created });
});

/** PATCH /api/machines/:id/images/:imageId */
export const updateImage = asyncHandler(async (req, res) => {
  const { id, imageId } = req.params;

  const image = await prisma.machineImage.findFirst({ where: { id: imageId, machineId: id } });
  if (!image) throw ApiError.notFound('Image not found');

  const { isMain, ...rest } = req.body;

  if (isMain === true) {
    // Exactly one main image per machine.
    await prisma.$transaction([
      prisma.machineImage.updateMany({ where: { machineId: id }, data: { isMain: false } }),
      prisma.machineImage.update({ where: { id: imageId }, data: { ...rest, isMain: true } }),
    ]);
  } else {
    await prisma.machineImage.update({
      where: { id: imageId },
      data: { ...rest, ...(isMain === false ? { isMain: false } : {}) },
    });
  }

  const images = await prisma.machineImage.findMany({
    where: { machineId: id },
    orderBy: [{ isMain: 'desc' }, { sortOrder: 'asc' }],
  });
  res.json({ success: true, data: images });
});

/** PUT /api/machines/:id/images/reorder */
export const reorderImages = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { order } = req.body;

  const owned = await prisma.machineImage.findMany({
    where: { machineId: id },
    select: { id: true },
  });
  const ownedIds = new Set(owned.map((image) => image.id));
  if (!order.every((imageId) => ownedIds.has(imageId))) {
    throw ApiError.badRequest('The order list contains images from another machine');
  }

  await prisma.$transaction(
    order.map((imageId, index) =>
      prisma.machineImage.update({ where: { id: imageId }, data: { sortOrder: index } }),
    ),
  );

  const images = await prisma.machineImage.findMany({
    where: { machineId: id },
    orderBy: [{ isMain: 'desc' }, { sortOrder: 'asc' }],
  });
  res.json({ success: true, data: images });
});

/** DELETE /api/machines/:id/images/:imageId */
export const deleteImage = asyncHandler(async (req, res) => {
  const { id, imageId } = req.params;

  const image = await prisma.machineImage.findFirst({ where: { id: imageId, machineId: id } });
  if (!image) throw ApiError.notFound('Image not found');

  await prisma.machineImage.delete({ where: { id: imageId } });

  await Promise.allSettled([
    storage.delete(image.storageKey),
    storage.delete(image.storageKey.replace(/\.webp$/, '-thumb.webp')),
  ]);

  // Promote the next image so the machine never loses its card visual.
  if (image.isMain) {
    const next = await prisma.machineImage.findFirst({
      where: { machineId: id },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    if (next) await prisma.machineImage.update({ where: { id: next.id }, data: { isMain: true } });
  }

  const images = await prisma.machineImage.findMany({
    where: { machineId: id },
    orderBy: [{ isMain: 'desc' }, { sortOrder: 'asc' }],
  });
  res.json({ success: true, data: images });
});

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

/** POST /api/machines/:id/documents — multipart, field name `documents` */
export const addDocuments = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const machine = await prisma.machine.findUnique({
    where: { id },
    select: { id: true, nameEn: true, nameAr: true, _count: { select: { documents: true } } },
  });
  if (!machine) throw ApiError.notFound('Machine not found');
  if (!req.files?.length) throw ApiError.badRequest('No documents were received');

  const offset = machine._count.documents;

  const stored = await Promise.all(
    req.files.map((file) => storeDocument(file, `documents/${id}`)),
  );

  const created = await prisma.$transaction(
    stored.map((document, index) =>
      prisma.machineDocument.create({
        data: {
          machineId: id,
          titleEn: req.body.titleEn || req.files[index].originalname,
          titleAr: req.body.titleAr || req.files[index].originalname,
          url: document.url,
          storageKey: document.storageKey,
          mimeType: document.mimeType,
          fileSize: document.fileSize,
          sortOrder: offset + index,
        },
      }),
    ),
  );

  res.status(201).json({ success: true, data: created });
});

/** DELETE /api/machines/:id/documents/:documentId */
export const deleteDocument = asyncHandler(async (req, res) => {
  const { id, documentId } = req.params;

  const document = await prisma.machineDocument.findFirst({
    where: { id: documentId, machineId: id },
  });
  if (!document) throw ApiError.notFound('Document not found');

  await prisma.machineDocument.delete({ where: { id: documentId } });
  await Promise.allSettled([storage.delete(document.storageKey)]);

  res.json({ success: true, data: { id: documentId, message: 'Document deleted' } });
});
