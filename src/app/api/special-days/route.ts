import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ensureDbSchemaSync } from '@/lib/db-sync';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await ensureDbSchemaSync();
    const specialDays = await prisma.specialDay.findMany({
      orderBy: { miladiDate: 'asc' }
    });
    return NextResponse.json({ success: true, specialDays });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDbSchemaSync();
    const body = await req.json();
    const { title, hijriDate, miladiDate, targetGroup, status, content, hasAudio, audioUrl } = body;

    if (!title || !miladiDate || !content) {
      return NextResponse.json({ success: false, error: 'Başlık, Miladi Tarih ve İçerik zorunludur.' }, { status: 400 });
    }

    const specialDay = await prisma.specialDay.create({
      data: {
        title,
        hijriDate,
        miladiDate: new Date(miladiDate),
        targetGroup: targetGroup || 'Tüm Aboneler',
        status: status || 'PLANLANDI',
        content,
        hasAudio: Boolean(hasAudio),
        audioUrl
      }
    });

    return NextResponse.json({ success: true, specialDay }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
