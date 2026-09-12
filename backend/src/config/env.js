import 'dotenv/config';

/**
 * Central, validated configuration. Nothing elsewhere in the codebase reads
 * `process.env` directly — that keeps every tunable discoverable in one place
 * and makes a missing secret fail loudly at boot instead of at request time.
 */

const bool = (value, fallback = false) => {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const int = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const list = (value, fallback = []) =>
  value ? String(value).split(',').map((item) => item.trim()).filter(Boolean) : fallback;

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: int(process.env.PORT, 4000),
  apiPrefix: process.env.API_PREFIX || '/api',

  databaseUrl: process.env.DATABASE_URL,

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  cors: {
    // Comma-separated list. Defaults cover the Angular dev server.
    origins: list(process.env.CORS_ORIGINS, ['http://localhost:4200', 'http://127.0.0.1:4200']),
  },

  storage: {
    // 'local' writes to ./uploads and serves it from the API.
    // 's3' targets any S3-compatible bucket (AWS S3, Cloudflare R2, DO Spaces, MinIO).
    driver: (process.env.STORAGE_DRIVER || 'local').toLowerCase(),
    publicUrl: (process.env.PUBLIC_URL || `http://localhost:${int(process.env.PORT, 4000)}`).replace(/\/$/, ''),
    local: {
      directory: process.env.UPLOAD_DIR || 'uploads',
      // Route the static files are mounted on.
      route: '/uploads',
    },
    s3: {
      bucket: process.env.S3_BUCKET,
      region: process.env.S3_REGION || 'auto',
      endpoint: process.env.S3_ENDPOINT || undefined,
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      // Required for R2/MinIO; AWS S3 works with virtual-hosted style.
      forcePathStyle: bool(process.env.S3_FORCE_PATH_STYLE, false),
      // CDN / custom domain in front of the bucket, e.g. https://cdn.rashidi.com
      cdnUrl: (process.env.S3_CDN_URL || '').replace(/\/$/, ''),
    },
  },

  uploads: {
    maxFileSizeMb: int(process.env.MAX_FILE_SIZE_MB, 12),
    maxFilesPerRequest: int(process.env.MAX_FILES_PER_REQUEST, 12),
    imageMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    documentMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    // Output sizes produced by sharp on upload.
    fullWidth: int(process.env.IMAGE_FULL_WIDTH, 1920),
    thumbWidth: int(process.env.IMAGE_THUMB_WIDTH, 640),
    quality: int(process.env.IMAGE_QUALITY, 82),
  },

  mail: {
    enabled: bool(process.env.SMTP_ENABLED, false),
    host: process.env.SMTP_HOST,
    port: int(process.env.SMTP_PORT, 587),
    secure: bool(process.env.SMTP_SECURE, false),
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.MAIL_FROM || 'Rashidy Website <no-reply@rashidi.com>',
    // Where contact-form enquiries are delivered.
    to: process.env.MAIL_TO,
  },

  rateLimit: {
    windowMinutes: int(process.env.RATE_LIMIT_WINDOW_MINUTES, 15),
    max: int(process.env.RATE_LIMIT_MAX, 300),
    contactMax: int(process.env.RATE_LIMIT_CONTACT_MAX, 5),
    loginMax: int(process.env.RATE_LIMIT_LOGIN_MAX, 10),
  },
};

/** Fails fast on misconfiguration rather than 500-ing on the first request. */
export function assertConfig() {
  const problems = [];

  if (!env.databaseUrl) problems.push('DATABASE_URL is required.');

  if (!env.jwt.secret) {
    problems.push('JWT_SECRET is required.');
  } else if (env.isProduction && env.jwt.secret.length < 32) {
    problems.push('JWT_SECRET must be at least 32 characters in production.');
  }

  if (env.storage.driver === 's3') {
    const { bucket, accessKeyId, secretAccessKey } = env.storage.s3;
    if (!bucket) problems.push('S3_BUCKET is required when STORAGE_DRIVER=s3.');
    if (!accessKeyId) problems.push('S3_ACCESS_KEY_ID is required when STORAGE_DRIVER=s3.');
    if (!secretAccessKey) problems.push('S3_SECRET_ACCESS_KEY is required when STORAGE_DRIVER=s3.');
  } else if (env.storage.driver !== 'local') {
    problems.push(`Unknown STORAGE_DRIVER "${env.storage.driver}". Use "local" or "s3".`);
  }

  if (env.mail.enabled && !env.mail.host) {
    problems.push('SMTP_HOST is required when SMTP_ENABLED=true.');
  }

  if (problems.length) {
    throw new Error(`Invalid configuration:\n  - ${problems.join('\n  - ')}`);
  }
}
