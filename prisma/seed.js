require('dotenv').config({ quiet: true });

const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function requireEnvWithFallback(name, fallbackName) {
  return process.env[name] || requireEnv(fallbackName);
}

async function main() {
  const name = requireEnvWithFallback('ADMIN_NAME', 'SUPER_ADMIN_NAME');
  const email = requireEnvWithFallback('ADMIN_EMAIL', 'SUPER_ADMIN_EMAIL').trim().toLowerCase();
  const password = requireEnvWithFallback('ADMIN_PASSWORD', 'SUPER_ADMIN_PASSWORD');
  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 12);

  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters long');
  }

  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      password: hashedPassword,
      role: 'ADMIN'
    },
    create: {
      name,
      email,
      password: hashedPassword,
      role: 'ADMIN'
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true
    }
  });

  console.log(`Seeded ADMIN: ${admin.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
