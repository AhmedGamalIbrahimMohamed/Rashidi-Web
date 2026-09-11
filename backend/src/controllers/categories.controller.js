import { prisma } from '../lib/prisma.js';
import { ApiError, asyncHandler } from '../utils/errors.js';
import { uniqueSlug } from '../utils/slug.js';

/** GET /api/categories */
export const listCategories = asyncHandler(async (req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { nameEn: 'asc' }],
    include: {
      _count: {
        // Visitors only care about live machines; staff see the full count.
        select: { machines: req.user ? true : { where: { isPublished: true } } },
      },
    },
  });

  res.json({ success: true, data: categories });
});

/** GET /api/categories/:id — accepts a cuid or a slug */
export const getCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const category = await prisma.category.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    include: { _count: { select: { machines: true } } },
  });
  if (!category) throw ApiError.notFound('Category not found');
  res.json({ success: true, data: category });
});

/** POST /api/categories */
export const createCategory = asyncHandler(async (req, res) => {
  const { slug, ...rest } = req.body;
  const category = await prisma.category.create({
    data: { ...rest, slug: await uniqueSlug('category', slug || rest.nameEn || rest.nameAr) },
  });
  res.status(201).json({ success: true, data: category });
});

/** PUT /api/categories/:id */
export const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { slug, ...rest } = req.body;

  const existing = await prisma.category.findUnique({ where: { id }, select: { slug: true } });
  if (!existing) throw ApiError.notFound('Category not found');

  const category = await prisma.category.update({
    where: { id },
    data: {
      ...rest,
      ...(slug && slug !== existing.slug ? { slug: await uniqueSlug('category', slug, id) } : {}),
    },
  });

  res.json({ success: true, data: category });
});

/**
 * DELETE /api/categories/:id
 * Machines are kept and simply become uncategorised (schema onDelete: SetNull),
 * so removing a category can never destroy catalogue data.
 */
export const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { machines: true } } },
  });
  if (!category) throw ApiError.notFound('Category not found');

  await prisma.category.delete({ where: { id } });

  res.json({
    success: true,
    data: {
      id,
      message:
        category._count.machines > 0
          ? `Category deleted. ${category._count.machines} machine(s) are now uncategorised.`
          : 'Category deleted',
    },
  });
});

/** PUT /api/categories/reorder */
export const reorderCategories = asyncHandler(async (req, res) => {
  const { order } = req.body;

  await prisma.$transaction(
    order.map((id, index) =>
      prisma.category.update({ where: { id }, data: { sortOrder: index } }),
    ),
  );

  const categories = await prisma.category.findMany({ orderBy: [{ sortOrder: 'asc' }] });
  res.json({ success: true, data: categories });
});
