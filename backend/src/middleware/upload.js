import multer from 'multer';
import { env } from '../config/env.js';
import { ApiError } from '../utils/errors.js';

/**
 * Uploads are buffered in memory: every image goes straight through sharp and
 * then to the storage driver, so writing a temp file first would only add IO.
 * The size cap keeps memory use bounded.
 */
const memory = multer.memoryStorage();

const filter = (allowed) => (_req, file, cb) => {
  if (allowed.includes(file.mimetype)) return cb(null, true);
  return cb(ApiError.unsupportedMedia(`"${file.mimetype}" is not an accepted file type`));
};

const limits = {
  fileSize: env.uploads.maxFileSizeMb * 1024 * 1024,
  files: env.uploads.maxFilesPerRequest,
};

export const uploadImages = multer({
  storage: memory,
  limits,
  fileFilter: filter(env.uploads.imageMimeTypes),
}).array('images', env.uploads.maxFilesPerRequest);

export const uploadSingleImage = multer({
  storage: memory,
  limits,
  fileFilter: filter(env.uploads.imageMimeTypes),
}).single('image');

export const uploadDocuments = multer({
  storage: memory,
  limits,
  fileFilter: filter([...env.uploads.documentMimeTypes, ...env.uploads.imageMimeTypes]),
}).array('documents', env.uploads.maxFilesPerRequest);
