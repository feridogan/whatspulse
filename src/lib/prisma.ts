import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (url && !url.includes('localhost:5432')) {
    return url;
  }
  // Default to Coolify / Docker internal container service
  return 'postgresql://whatspulse:whatspulse_secret_2026@whatspulse_postgres:5432/whatspulse?schema=public';
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: resolveDatabaseUrl(),
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
