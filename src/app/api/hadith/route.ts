import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ensureDbSchemaSync } from '@/lib/db-sync';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await ensureDbSchemaSync();
    const hadiths = await prisma.hadith.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ success: true, hadiths });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDbSchemaSync();
    const body = await req.json();
    const { arabic, turkish, source, category, tags, audioUrl } = body;

    if (!arabic || !turkish) {
      return NextResponse.json({ success: false, error: 'Arapça ve Türkçe metin zorunludur.' }, { status: 400 });
    }

    const hadith = await prisma.hadith.create({
      data: {
        arabic,
        turkish,
        source,
        category: category || 'Genel Hikmet',
        tags: Array.isArray(tags) ? tags : [],
        audioUrl
      }
    });

    return NextResponse.json({ success: true, hadith }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
