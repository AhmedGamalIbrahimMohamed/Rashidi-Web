import { Router } from 'express';
import {
  deleteContent,
  getContent,
  getContentBlock,
  upsertContent,
  uploadContentImage,
} from '../controllers/content.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { uploadSingleImage } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { contentBulkSchema, contentUpsertSchema } from '../validators/schemas.js';
import { ApiError } from '../utils/errors.js';

export const contentRoutes = Router();

contentRoutes.get('/', getContent);

// Generic image upload used by the content editor — declared before '/:key'.
contentRoutes.post('/media', requireAuth, uploadSingleImage, uploadContentImage);

contentRoutes.get('/:key', getContentBlock);

/**
 * PUT /api/content accepts either a single block or `{ items: [...] }`, so the
 * dashboard can save one field inline or a whole section at once.
 */
contentRoutes.put(
  '/',
  requireAuth,
  (req, _res, next) => {
    const schema = Array.isArray(req.body?.items) ? contentBulkSchema : contentUpsertSchema;
    return validate(schema)(req, _res, next);
  },
  upsertContent,
);

contentRoutes.delete('/:key', requireAuth, (req, res, next) => {
  if (!/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/i.test(req.params.key)) {
    return next(ApiError.badRequest('Invalid content key'));
  }
  return deleteContent(req, res, next);
});
