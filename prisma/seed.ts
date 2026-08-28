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
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Sistem Yöneticisi',
        password: hashedPassword,
        role: Role.ADMIN,
        isActive: true,
      },
    });
    console.log(`✅ Admin user created: ${admin.email} (Password: Admin123!)`);
  } else {
    console.log(`ℹ️ Admin user already exists: ${existingAdmin.email}`);
  }

  // 1.1 Seed Standard User
  const userEmail = 'user@whatspulse.com';
  const existingUser = await prisma.user.findUnique({
    where: { email: userEmail },
  });

  if (!existingUser) {
    const hashedPassword = await bcrypt.hash('User123!', 10);
    const user = await prisma.user.create({
      data: {
        email: userEmail,
        name: 'Standart Kullanıcı',
        password: hashedPassword,
        role: Role.USER,
        isActive: true,
      },
    });
    console.log(`✅ Standard user created: ${user.email} (Password: User123!)`);
  } else {
    console.log(`ℹ️ Standard user already exists: ${existingUser.email}`);
  }

  // 2. Seed Default Settings (Evolution API & Anti-Ban)
  const defaultSettings = [
    {
      key: 'evolution_api',
      value: {
        apiUrl: process.env.EVOLUTION_API_URL || 'https://evo-rc.cakirlar.net',
        instanceName: process.env.EVOLUTION_INSTANCE || 'feridun',
        instanceKey: process.env.EVOLUTION_API_KEY || '11E1F8329577-40D3-B891-9CCA41C01658',
        globalApiKey: process.env.EVOLUTION_GLOBAL_KEY || '4a8f9c2d1e0b3a5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f',
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
    const existing = await prisma.setting.findUnique({
      where: { key: s.key },
    });
    if (!existing) {
      await prisma.setting.create({
        data: { key: s.key, value: s.value },
      });
      console.log(`✅ Default setting created: ${s.key}`);
    } else {
      console.log(`ℹ️ Setting already exists (preserving user config): ${s.key}`);
    }
  }

  // 3. Seed Default Contact Groups
  const defaultGroups = [
    { name: 'Tüm Müşteriler', description: 'Kayıtlı aktif müşteri listesi', color: '#10b981' },
    { name: 'VIP Müşteriler', description: 'Özel teklif ve indirim grubu', color: '#8b5cf6' },
    { name: 'Potansiyel Müşteriler', description: 'Henüz satın alım yapmamış adaylar', color: '#f59e0b' },
    { name: 'Personel / Ekip', description: 'Dahili kurumsal iletişim grubu', color: '#3b82f6' },
  ];

  for (const group of defaultGroups) {
    await prisma.group.upsert({
      where: { name: group.name },
      update: {},
      create: group,
    });
  }
  console.log('✅ Default contact groups created');

  // 4. Seed Default WhatsApp Templates
  const defaultTemplates = [
    {
      name: 'Hoşgeldiniz & Tanışma',
      content: 'Merhaba {isim}, WhatsPulse ailesine hoş geldiniz! 🎉 Size özel fırsatlardan haberdar olmak için bu mesajı kaydedebilirsiniz. İptal için IPTAL yazabilirsiniz.',
      mediaType: 'text',
      variables: ['isim'],
    },
    {
      name: 'Randevu & Hatırlatma',
      content: 'Sayın {isim}, {tarih} günü saat {saat} için planlanan randevunuzu hatırlatmak isteriz. Bir değişiklik durumunda lütfen bize bu hattan bilgi veriniz.',
      mediaType: 'text',
      variables: ['isim', 'tarih', 'saat'],
    },
    {
      name: 'Sipariş & Kargo Bilgilendirme',
      content: 'Sayın {isim}, siparişiniz kargoya verilmiştir! 📦 Takip No: {takip_no}. Bizi tercih ettiğiniz için teşekkür ederiz.',
      mediaType: 'text',
      variables: ['isim', 'takip_no'],
    },
    {
      name: 'Özel Kampanya & İndirim (Görselli)',
      content: 'Fırsat Başladı! 🔥 Sayın {isim}, bu haftaya özel tüm ürünlerde geçerli %20 indirim kodunuz: PULSE20. Detaylı bilgi için hemen yanıtlayın!\n\nİptal için IPTAL yazınız.',
      mediaType: 'image',
      mediaUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=80',
      variables: ['isim'],
    },
  ];

  for (const t of defaultTemplates) {
    const existing = await prisma.template.findFirst({ where: { name: t.name } });
    if (!existing) {
      await prisma.template.create({ data: t });
    }
  }
  console.log('✅ Ready-to-use WhatsApp templates created');

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
