import fs from 'node:fs';
import path from 'node:path';
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { apiLimiter } from './middleware/rate-limit.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { apiRouter } from './routes/index.js';

export function createApp() {
  const app = express();

  // Behind nginx / a platform load balancer, so req.ip and the rate limiter
  // read the real client address rather than the proxy's.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      // The API only serves JSON and images; CSP belongs on the web server that
      // hosts the Angular bundle, and a default CSP here would block hot-linked
      // images from the CDN.
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
        // Same-origin requests, curl and server-to-server calls send no Origin.
        if (!origin) return callback(null, true);
        if (env.cors.origins.includes(origin)) return callback(null, true);
        return callback(new Error(`Origin ${origin} is not allowed by CORS`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
  );

  app.use(compression());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  if (!env.isProduction) app.use(morgan('dev'));
  else app.use(morgan('combined'));

  // Serve locally-stored uploads. With STORAGE_DRIVER=s3 this directory stays
  // empty and the mount is simply unused.
  if (env.storage.driver === 'local') {
    app.use(
      env.storage.local.route,
      express.static(path.resolve(process.cwd(), env.storage.local.directory), {
        maxAge: '365d',
        immutable: true,
        index: false,
        dotfiles: 'deny',
      }),
    );
  }

  app.use(env.apiPrefix, apiLimiter, apiRouter);

  const webDir = path.resolve(process.cwd(), env.webDir);
  const webIndex = path.join(webDir, 'index.html');
  if (fs.existsSync(webIndex)) {
    // Hashed bundles are immutable; index.html must always be revalidated so a
    // deploy is picked up on the next visit.
    app.use(
      express.static(webDir, {
        index: false,
        dotfiles: 'deny',
        setHeaders(res, filePath) {
          if (/-[A-Z0-9]{8}\.(js|css)$/.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      }),
    );

    // Client-side routes all resolve to the SPA shell.
    app.get('*', (req, res, next) => {
      const reserved = [env.apiPrefix, env.storage.local.route];
      if (reserved.some((prefix) => req.path === prefix || req.path.startsWith(`${prefix}/`))) return next();
      if (!req.accepts('html')) return next();
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(webIndex);
    });
  }

  app.get('/', (_req, res) => {
    res.json({
      success: true,
      data: {
        name: 'Rashidy Import & Export API',
        docs: `${env.apiPrefix}/health`,
      },
    });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
