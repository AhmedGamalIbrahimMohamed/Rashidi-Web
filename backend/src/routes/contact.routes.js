import { Router } from 'express';
import {
  dashboardStats,
  deleteMessage,
  getMessage,
  listMessages,
  submitContact,
  updateMessageStatus,
} from '../controllers/contact.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { contactLimiter } from '../middleware/rate-limit.js';
import { validate } from '../middleware/validate.js';
import {
  contactQuerySchema,
  contactSchema,
  contactStatusSchema,
} from '../validators/schemas.js';

export const contactRoutes = Router();

// --- Public -----------------------------------------------------------------
contactRoutes.post('/', contactLimiter, validate(contactSchema), submitContact);

// --- Admin inbox ------------------------------------------------------------
// Declared before '/:id' so "stats" is not read as a message id.
contactRoutes.get('/stats/overview', requireAuth, dashboardStats);
contactRoutes.get('/', requireAuth, validate(contactQuerySchema, 'query'), listMessages);
contactRoutes.get('/:id', requireAuth, getMessage);
contactRoutes.patch('/:id', requireAuth, validate(contactStatusSchema), updateMessageStatus);
contactRoutes.delete('/:id', requireAuth, deleteMessage);
