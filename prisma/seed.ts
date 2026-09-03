import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Seed Admin User
  const adminEmail = 'admin@whatspulse.com';
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    const admin = await prisma.user.upsert({
      where: { email: 'admin@whatspulse.com' },
      update: {
        name: 'Feridun Doğan',
      },
      create: {
        email: 'admin@whatspulse.com',
        name: 'Feridun Doğan',
        password: hashedPassword,
        role: Role.ADMIN,
        isActive: true,
      },
    });
    console.log(`✅ Admin user created: ${admin.email} (Password: Admin123!)`);
  } else {
    console.log(`ℹ️ Admin user already exists: ${existingAdmin.email}`);
  }

  // 2. Seed Default Settings (Evolution API & Anti-Ban)
  const defaultSettings = [
    {
      key: 'evolution_api',
      value: {
        apiUrl: process.env.EVOLUTION_API_URL || 'http://10.0.201.201:3800',
        instanceName: process.env.EVOLUTION_INSTANCE || 'ff',
        instanceKey: process.env.EVOLUTION_API_KEY || '42A33C177D1A-4165-8F1D-0C6491AA85DD7DE66D9',
        globalApiKey: process.env.EVOLUTION_GLOBAL_KEY || '16f54b4d7f24e095e8e88761f3bc993d863cafced9d6f99939824d28a206726a',
        webhookUrl: process.env.APP_URL ? `${process.env.APP_URL}/api/webhook/evolution` : 'https://mesaj.cakirlar.net/api/webhook/evolution',
        autoSyncContacts: true,
      },
    },
    {
      key: 'antiban_config',
      value: {
        minDelay: 8,
        maxDelay: 20,
        batchSize: 25,
        batchPause: 60,
        optOutKeywords: ['IPTAL', 'STOP', 'CIK', 'RED', 'UNSUBSCRIBE', 'İPTAL', 'ÇIK'],
        autoBlacklistOnOptOut: true,
      },
    },
  ];

  for (const s of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { key: s.key, value: s.value },
    });
    console.log(`✅ Setting synced: ${s.key}`);
  }

  // Note: Groups table starts completely empty (0 groups). No auto-groups seeded.

  console.log('🎉 Database seeding completed successfully (Groups: 0)!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
