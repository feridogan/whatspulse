import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { normalizePhone, formatPhoneNumber } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') || '').trim();
    const groupId = (searchParams.get('groupId') || '').trim();
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '500', 10);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (groupId) {
      where.groups = {
        some: {
          groupId: groupId,
        },
      };
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        include: {
          groups: {
            include: {
              group: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.contact.count({ where }),
    ]);

    return NextResponse.json({
      contacts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone: rawPhone, email, notes, groupIds, customFields, isBlacklisted } = body;

    if (!rawPhone || !rawPhone.trim()) {
      return NextResponse.json({ error: 'Telefon numarası zorunludur.' }, { status: 400 });
    }

    const phone = formatPhoneNumber(rawPhone);
    if (!phone || phone.length < 10) {
      return NextResponse.json({ error: 'Geçersiz telefon numarası.' }, { status: 400 });
    }

    const contact = await prisma.contact.create({
      data: {
        name: (name || `Kişi ${phone.slice(-4)}`).trim(),
        phone,
        email: email?.trim() || null,
        notes: notes?.trim() || null,
        isBlacklisted: Boolean(isBlacklisted),
        customFields: customFields || {},
        groups: Array.isArray(groupIds) && groupIds.length > 0 ? {
          create: groupIds.map((gId: string) => ({
            group: { connect: { id: gId } },
          })),
        } : undefined,
      },
      include: {
        groups: {
          include: { group: true },
        },
      },
    });

    if (isBlacklisted) {
      await prisma.blacklist.upsert({
        where: { phone },
        update: { reason: 'Manuel engelleme' },
        create: { phone, reason: 'Manuel engelleme', addedBy: 'Admin' },
      });
    }

    return NextResponse.json(contact, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Bu telefon numarası zaten kayıtlı.' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Bulk delete endpoint
export async function DELETE(req: NextRequest) {
  try {
    const { ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Silinecek kişi ID listesi gereklidir.' }, { status: 400 });
    }

    const result = await prisma.contact.deleteMany({
      where: { id: { in: ids } },
    });

    return NextResponse.json({ success: true, count: result.count });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
