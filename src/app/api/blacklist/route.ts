import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { normalizePhone } from '@/lib/utils';

export async function GET() {
  try {
    const list = await prisma.blacklist.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(list);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { phone: rawPhone, reason, addedBy } = await req.json();

    if (!rawPhone) {
      return NextResponse.json({ error: 'Telefon numarası zorunludur.' }, { status: 400 });
    }

    const phone = normalizePhone(rawPhone);

    const blacklisted = await prisma.blacklist.upsert({
      where: { phone },
      update: {
        reason: reason || 'Manuel engelleme',
        addedBy: addedBy || 'Admin',
      },
      create: {
        phone,
        reason: reason || 'Manuel engelleme',
        addedBy: addedBy || 'Admin',
      },
    });

    // Also update contact if exists
    await prisma.contact.updateMany({
      where: { phone },
      data: { isBlacklisted: true },
    });

    return NextResponse.json(blacklisted, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json({ error: 'Telefon numarası gereklidir.' }, { status: 400 });
    }

    const normalized = normalizePhone(phone);

    await prisma.blacklist.deleteMany({
      where: { phone: normalized },
    });

    await prisma.contact.updateMany({
      where: { phone: normalized },
      data: { isBlacklisted: false },
    });

    return NextResponse.json({ success: true, message: 'Numara kara listeden çıkarıldı.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
