import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ensureDbSchemaSync } from '@/lib/db-sync';

export const dynamic = 'force-dynamic';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await ensureDbSchemaSync();
    await prisma.specialDay.delete({
      where: { id: params.id }
    });
    return NextResponse.json({ success: true, message: 'Özel gün tebriği silindi.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
