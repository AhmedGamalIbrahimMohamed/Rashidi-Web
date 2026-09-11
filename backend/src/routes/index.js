import { Router } from 'express';
import { authRoutes } from './auth.routes.js';
import { machineRoutes } from './machines.routes.js';
import { categoryRoutes } from './categories.routes.js';
import { contentRoutes } from './content.routes.js';
import { contactRoutes } from './contact.routes.js';
import { env } from '../config/env.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      service: 'rashidi-api',
      status: 'ok',
      environment: env.nodeEnv,
      storage: env.storage.driver,
      time: new Date().toISOString(),
    },
  });
});

apiRouter.use('/auth', authRoutes);
apiRouter.use('/machines', machineRoutes);
apiRouter.use('/categories', categoryRoutes);
apiRouter.use('/content', contentRoutes);
apiRouter.use('/contact', contactRoutes);
