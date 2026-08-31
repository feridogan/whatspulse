import prisma from './prisma';

let isSynced = false;

export async function ensureDbSchemaSync() {
  if (isSynced) return;
  try {
    // Ensure ContactGroup table matches Prisma schema: id (PK), unique(contactId, groupId), createdAt
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        -- Add id column if not exists
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

        -- Ensure unique constraint or index on (contactId, groupId)
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'ContactGroup_contactId_groupId_key'
        ) AND NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE indexname = 'ContactGroup_contactId_groupId_key'
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
  } catch (err: any) {
    console.warn('[DB Schema Sync Warning]:', err.message);
  }
}
