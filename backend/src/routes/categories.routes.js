import { Router } from 'express';
import { z } from 'zod';
import {
  createCategory,
  deleteCategory,
  getCategory,
  listCategories,
  reorderCategories,
  updateCategory,
} from '../controllers/categories.controller.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { categoryCreateSchema, categoryUpdateSchema } from '../validators/schemas.js';

export const categoryRoutes = Router();

categoryRoutes.get('/', optionalAuth, listCategories);

// Registered before '/:id' so "reorder" is not swallowed as an id.
categoryRoutes.put(
  '/reorder',
  requireAuth,
  validate(z.object({ order: z.array(z.string().min(1)).min(1) })),
  reorderCategories,
);

categoryRoutes.get('/:id', getCategory);
categoryRoutes.post('/', requireAuth, validate(categoryCreateSchema), createCategory);
categoryRoutes.put('/:id', requireAuth, validate(categoryUpdateSchema), updateCategory);
categoryRoutes.delete('/:id', requireAuth, deleteCategory);
