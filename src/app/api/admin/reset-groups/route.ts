import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const authCheck = await requireAuth(req);
    if (authCheck.error) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    // 1. Delete all ContactGroup junction records
    const cgResult = await prisma.contactGroup.deleteMany({});

    // 2. Delete all Group records
    const groupResult = await prisma.group.deleteMany({});

    return NextResponse.json({
      success: true,
      deletedContactGroups: cgResult.count,
      deletedGroups: groupResult.count,
      message: `Tüm gruplar ve grup üyelikleri kalıcı olarak temizlendi (0 Grup). Kişi rehberi korundu.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
