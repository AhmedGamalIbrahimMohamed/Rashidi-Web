import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { signAccessToken, signRefreshToken } from '../middleware/auth.js';
import { ApiError, asyncHandler } from '../utils/errors.js';

const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  lastLogin: user.lastLogin,
});

/** POST /api/auth/login */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });

  // Compare against a dummy hash when the account is missing so the response
  // time does not reveal whether the email exists.
  const hash = user?.password || '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
  const passwordMatches = await bcrypt.compare(password, hash);

  if (!user || !passwordMatches) throw ApiError.unauthorized('Incorrect email or password');
  if (!user.isActive) throw ApiError.forbidden('This account has been deactivated');

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  res.json({
    success: true,
    data: {
      user: publicUser(updated),
      accessToken: signAccessToken(user),
      refreshToken: signRefreshToken(user),
      expiresIn: env.jwt.expiresIn,
    },
  });
});

/** POST /api/auth/refresh */
export const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  let payload;
  try {
    payload = jwt.verify(refreshToken, env.jwt.refreshSecret);
  } catch {
    throw ApiError.unauthorized('Refresh token is invalid or has expired');
  }
  if (payload.type !== 'refresh') throw ApiError.unauthorized('Wrong token type');

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) throw ApiError.unauthorized('Account is no longer active');

  res.json({
    success: true,
    data: {
      user: publicUser(user),
      accessToken: signAccessToken(user),
      refreshToken: signRefreshToken(user),
      expiresIn: env.jwt.expiresIn,
    },
  });
});

/** GET /api/auth/me */
export const me = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) throw ApiError.notFound('User not found');
  res.json({ success: true, data: publicUser(user) });
});

/** POST /api/auth/change-password */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) throw ApiError.notFound('User not found');

  const matches = await bcrypt.compare(currentPassword, user.password);
  if (!matches) throw ApiError.unauthorized('Current password is incorrect');

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await bcrypt.hash(newPassword, 12) },
  });

  res.json({ success: true, data: { message: 'Password updated' } });
});
