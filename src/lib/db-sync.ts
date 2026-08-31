import prisma from './prisma';

let isSynced = false;

export async function ensureDbSchemaSync() {
  if (isSynced) return;
  try {
    // 1. Ensure ContactGroup has id (PK), unique(contactId, groupId) and createdAt columns
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        -- Add id column if not exists
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='ContactGroup' AND column_name='id'
        ) THEN
          ALTER TABLE "ContactGroup" DROP CONSTRAINT IF EXISTS "ContactGroup_pkey";
          ALTER TABLE "ContactGroup" ADD COLUMN "id" TEXT;
          UPDATE "ContactGroup" SET "id" = md5(random()::text || clock_timestamp()::text) WHERE "id" IS NULL;
          ALTER TABLE "ContactGroup" ALTER COLUMN "id" SET NOT NULL;
          ALTER TABLE "ContactGroup" ADD PRIMARY KEY ("id");
        END IF;

        -- Ensure unique constraint on contactId and groupId
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'ContactGroup_contactId_groupId_key'
        ) THEN
          ALTER TABLE "ContactGroup" ADD CONSTRAINT "ContactGroup_contactId_groupId_key" UNIQUE ("contactId", "groupId");
        END IF;

        -- Add createdAt column if not exists
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='ContactGroup' AND column_name='createdAt'
        ) THEN
          ALTER TABLE "ContactGroup" ADD COLUMN "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
        END IF;
      END $$;
    `);

    isSynced = true;
    console.log('[DB Sync]: ContactGroup schema verified successfully.');
  } catch (err: any) {
    console.warn('[DB Schema Sync Warning]:', err.message);
  }
}
