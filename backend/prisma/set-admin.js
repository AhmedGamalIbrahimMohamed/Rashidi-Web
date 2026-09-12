/**
 * Creates or resets an administrator account.
 *
 * The seed deliberately refuses to touch an existing account's password, so
 * this is the deliberate way to change it — and the recovery path if the
 * dashboard password is ever lost.
 *
 *   npm run admin:set                                  # uses ADMIN_* from .env
 *   npm run admin:set -- you@example.com "newPassword" # explicit
 */
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  const [emailArg, passwordArg, nameArg] = process.argv.slice(2);

  const email = (emailArg || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = passwordArg || process.env.ADMIN_PASSWORD || '';
  const name = nameArg || process.env.ADMIN_NAME || 'Rashidy Administrator';

  if (!email || !password) {
    console.error(
      '\nUsage: npm run admin:set -- <email> <password> [name]\n' +
        'Or set ADMIN_EMAIL and ADMIN_PASSWORD in .env and run it with no arguments.\n',
    );
    process.exit(1);
  }

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error(`\n"${email}" is not a valid email address.\n`);
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);

  // Upsert so the same command works whether the account exists or not.
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, name, role: 'ADMIN', password: hash },
    update: { password: hash, role: 'ADMIN', isActive: true },
  });

  console.log(`\n  Admin ready — ${user.email}`);
  console.log('  Sign in at /admin/login\n');

  if (password.length < 12 || !/[^a-z0-9]/i.test(password)) {
    console.log(
      '  \x1b[33mNote: this password is short or has no symbols. Anyone who reaches\n' +
        '  /admin/login can try it — the API allows 10 attempts per 15 minutes.\x1b[0m\n',
    );
  }
}

main()
  .catch((error) => {
    console.error('\nCould not set the admin account:\n', error.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
