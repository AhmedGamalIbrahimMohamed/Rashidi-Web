import { Router } from 'express';
import { z } from 'zod';
import {
  addDocuments,
  addImages,
  createMachine,
  deleteDocument,
  deleteImage,
  deleteMachine,
  getMachine,
  listMachines,
  reorderImages,
  updateImage,
  updateMachine,
  updateStatus,
} from '../controllers/machines.controller.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { uploadDocuments, uploadImages } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import {
  MACHINE_STATUSES,
  imageReorderSchema,
  imageUpdateSchema,
  machineCreateSchema,
  machineQuerySchema,
  machineUpdateSchema,
} from '../validators/schemas.js';

export const machineRoutes = Router();

// --- Public -----------------------------------------------------------------
// optionalAuth lets signed-in staff preview unpublished machines on the live site.
machineRoutes.get('/', optionalAuth, validate(machineQuerySchema, 'query'), listMachines);
machineRoutes.get('/:id', optionalAuth, getMachine);

// --- Admin ------------------------------------------------------------------
machineRoutes.post('/', requireAuth, validate(machineCreateSchema), createMachine);
machineRoutes.put('/:id', requireAuth, validate(machineUpdateSchema), updateMachine);
machineRoutes.delete('/:id', requireAuth, deleteMachine);

machineRoutes.patch(
  '/:id/status',
  requireAuth,
  validate(z.object({ status: z.enum(MACHINE_STATUSES) })),
  updateStatus,
);

// Images — multer runs before validation because the body arrives as multipart.
machineRoutes.post('/:id/images', requireAuth, uploadImages, addImages);
machineRoutes.put('/:id/images/reorder', requireAuth, validate(imageReorderSchema), reorderImages);
machineRoutes.patch('/:id/images/:imageId', requireAuth, validate(imageUpdateSchema), updateImage);
machineRoutes.delete('/:id/images/:imageId', requireAuth, deleteImage);

// Optional spec sheets / manuals.
machineRoutes.post('/:id/documents', requireAuth, uploadDocuments, addDocuments);
machineRoutes.delete('/:id/documents/:documentId', requireAuth, deleteDocument);
