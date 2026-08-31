import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const adminKey = req.headers.get('x-admin-key');
    if (adminKey !== '16f54b4d7f24e095e8e88761f3bc993d863cafced9d6f99939824d28a206726a') {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
    }

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

    return NextResponse.json({
      success: true,
      message: 'ContactGroup tablosu şeması (id, createdAt, unique constraint) başarıyla güncellendi.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
