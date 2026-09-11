import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

const minutes = (n) => n * 60 * 1000;

const reject = (message) => (_req, res) =>
  res.status(429).json({ success: false, error: { message } });

/** Broad protection across the whole API surface. */
export const apiLimiter = rateLimit({
  windowMs: minutes(env.rateLimit.windowMinutes),
  max: env.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: reject('Too many requests, please slow down.'),
});

/** Brute-force protection on sign-in; successful logins are not counted. */
export const loginLimiter = rateLimit({
  windowMs: minutes(15),
  max: env.rateLimit.loginMax,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: reject('Too many sign-in attempts. Try again in a few minutes.'),
});

/** Keeps the contact form from being used as a spam relay. */
export const contactLimiter = rateLimit({
  windowMs: minutes(60),
  max: env.rateLimit.contactMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler: reject('You have already sent several enquiries. Please try again later.'),
});
