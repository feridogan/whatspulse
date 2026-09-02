import prisma from './prisma';

let isSynced = false;

export async function ensureDbSchemaSync() {
  if (isSynced) return;
  try {
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        -- 1. Ensure ContactGroup structure
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='ContactGroup' AND column_name='id'
        ) THEN
          ALTER TABLE "ContactGroup" DROP CONSTRAINT IF EXISTS "ContactGroup_pkey" CASCADE;
          ALTER TABLE "ContactGroup" ADD COLUMN "id" TEXT;
          UPDATE "ContactGroup" SET "id" = md5(random()::text || clock_timestamp()::text) WHERE "id" IS NULL;
          ALTER TABLE "ContactGroup" ALTER COLUMN "id" SET NOT NULL;
          ALTER TABLE "ContactGroup" ADD CONSTRAINT "ContactGroup_pkey" PRIMARY KEY ("id");
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'ContactGroup_contactId_groupId_key'
        ) AND NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE indexname = 'ContactGroup_contactId_groupId_key'
        ) THEN
          ALTER TABLE "ContactGroup" ADD CONSTRAINT "ContactGroup_contactId_groupId_key" UNIQUE ("contactId", "groupId");
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='ContactGroup' AND column_name='createdAt'
        ) THEN
          ALTER TABLE "ContactGroup" ADD COLUMN "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
        END IF;

        -- 2. Create Subscriber table if not exists
        CREATE TABLE IF NOT EXISTS "Subscriber" (
          "id" TEXT PRIMARY KEY,
          "name" TEXT NOT NULL,
          "phone" TEXT UNIQUE NOT NULL,
          "email" TEXT,
          "company" TEXT,
          "notes" TEXT,
          "channels" JSONB DEFAULT '["WhatsApp"]'::jsonb,
          "preferredTime" TEXT DEFAULT '08:00',
          "language" TEXT DEFAULT 'TR',
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "isInteractive" BOOLEAN NOT NULL DEFAULT false,
          "isBlacklisted" BOOLEAN NOT NULL DEFAULT false,
          "lastSentAt" TIMESTAMP(3),
          "customFields" JSONB DEFAULT '{}'::jsonb,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        -- 3. Create SubscriberGroup table if not exists
        CREATE TABLE IF NOT EXISTS "SubscriberGroup" (
          "id" TEXT PRIMARY KEY,
          "subscriberId" TEXT NOT NULL REFERENCES "Subscriber"("id") ON DELETE CASCADE,
          "groupId" TEXT NOT NULL REFERENCES "Group"("id") ON DELETE CASCADE,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "SubscriberGroup_subscriberId_groupId_key" UNIQUE ("subscriberId", "groupId")
        );

        -- 4. Create Domain table if not exists
        CREATE TABLE IF NOT EXISTS "Domain" (
          "id" TEXT PRIMARY KEY,
          "name" TEXT UNIQUE NOT NULL,
          "subscriberId" TEXT REFERENCES "Subscriber"("id") ON DELETE SET NULL,
          "registrar" TEXT DEFAULT 'METUNIC',
          "expiryDate" TIMESTAMP(3) NOT NULL,
          "sslExpiryDate" TIMESTAMP(3),
          "autoRenew" BOOLEAN NOT NULL DEFAULT false,
          "status" TEXT NOT NULL DEFAULT 'ACTIVE',
          "price" DOUBLE PRECISION DEFAULT 250,
          "currency" TEXT DEFAULT 'TL',
          "notes" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        -- 5. Create Order table if not exists
        CREATE TABLE IF NOT EXISTS "Order" (
          "id" TEXT PRIMARY KEY,
          "orderNumber" TEXT UNIQUE NOT NULL,
          "subscriberId" TEXT REFERENCES "Subscriber"("id") ON DELETE SET NULL,
          "domainId" TEXT REFERENCES "Domain"("id") ON DELETE SET NULL,
          "title" TEXT NOT NULL,
          "amount" DOUBLE PRECISION NOT NULL,
          "currency" TEXT NOT NULL DEFAULT 'TL',
          "status" TEXT NOT NULL DEFAULT 'PENDING',
          "items" JSONB DEFAULT '[]'::jsonb,
          "validUntil" TIMESTAMP(3),
          "notes" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        -- 6. Create NotificationLog table if not exists
        CREATE TABLE IF NOT EXISTS "NotificationLog" (
          "id" TEXT PRIMARY KEY,
          "subscriberId" TEXT REFERENCES "Subscriber"("id") ON DELETE SET NULL,
          "domainId" TEXT REFERENCES "Domain"("id") ON DELETE SET NULL,
          "channel" TEXT NOT NULL DEFAULT 'WhatsApp',
          "type" TEXT NOT NULL DEFAULT 'DOMAIN_RENEWAL',
          "status" TEXT NOT NULL DEFAULT 'SENT',
          "recipient" TEXT NOT NULL,
          "content" TEXT NOT NULL,
          "error" TEXT,
          "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        -- 7. Create SystemConfig table if not exists
        CREATE TABLE IF NOT EXISTS "SystemConfig" (
          "id" TEXT PRIMARY KEY,
          "key" TEXT UNIQUE NOT NULL,
          "value" JSONB NOT NULL,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        -- 8. Create SpecialDay table if not exists
        CREATE TABLE IF NOT EXISTS "SpecialDay" (
          "id" TEXT PRIMARY KEY,
          "title" TEXT NOT NULL,
          "hijriDate" TEXT,
          "miladiDate" TIMESTAMP(3) NOT NULL,
          "targetGroup" TEXT DEFAULT 'Tüm Aboneler',
          "status" TEXT NOT NULL DEFAULT 'PLANLANDI',
          "content" TEXT NOT NULL,
          "hasAudio" BOOLEAN NOT NULL DEFAULT false,
          "audioUrl" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        -- 9. Clean up legacy default seed groups if they exist
        DELETE FROM "Group" WHERE "name" IN ('Tüm Müşteriler', 'VIP Müşteriler', 'Potansiyel Müşteriler', 'Personel / Ekip');

        -- 10. Add scheduledAt and SCHEDULED enum to Campaign table
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='Campaign' AND column_name='scheduledAt'
        ) THEN
          ALTER TABLE "Campaign" ADD COLUMN "scheduledAt" TIMESTAMP(3);
        END IF;

        -- 11. Add avatar and isCustomName columns to Contact and Subscriber tables
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Contact' AND column_name='avatar') THEN
          ALTER TABLE "Contact" ADD COLUMN "avatar" TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Contact' AND column_name='isCustomName') THEN
          ALTER TABLE "Contact" ADD COLUMN "isCustomName" BOOLEAN DEFAULT false;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Subscriber' AND column_name='avatar') THEN
          ALTER TABLE "Subscriber" ADD COLUMN "avatar" TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Subscriber' AND column_name='isCustomName') THEN
          ALTER TABLE "Subscriber" ADD COLUMN "isCustomName" BOOLEAN DEFAULT false;
        END IF;

        BEGIN
          ALTER TYPE "CampaignStatus" ADD VALUE IF NOT EXISTS 'SCHEDULED';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;

        BEGIN
          ALTER TYPE "CampaignStatus" ADD VALUE IF NOT EXISTS 'PENDING';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;

        BEGIN
          ALTER TYPE "CampaignStatus" ADD VALUE IF NOT EXISTS 'RUNNING';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
      END $$;
    `);

    isSynced = true;
  } catch (err: any) {
    console.warn('[DB Schema Sync Warning]:', err.message);
  }
}
