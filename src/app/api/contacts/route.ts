import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { normalizePhone, formatPhoneNumber } from '@/lib/utils';
import { ensureDbSchemaSync } from '@/lib/db-sync';
import { isValidContactName } from '@/lib/phone-utils';
import { POST as cleanupDuplicatesHandler } from './cleanup-duplicates/route';
import { POST as cleanupInvalidHandler } from './cleanup-invalid/route';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await ensureDbSchemaSync();

    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') || '').trim();
    const groupId = (searchParams.get('groupId') || '').trim();
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10000', 10);
    const skip = (page - 1) * limit;

    const andConditions: any[] = [];

    if (search) {
      andConditions.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
          { email: { contains: search, mode: 'insensitive' } },
          { notes: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (groupId) {
      andConditions.push({
        groups: {
          some: {
            groupId: groupId,
          },
        },
      });
    }

    const where: any = andConditions.length > 0 ? { AND: andConditions } : {};

    const [rawContacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        include: {
          groups: {
            include: {
              group: true,
            },
          },
        },
        orderBy: { name: 'asc' },
        skip: limit >= 10000 ? 0 : skip,
        take: limit,
      }),
      prisma.contact.count({ where }),
    ]);

    // Strict in-memory validation: NO contacts starting with '.', empty names, or invalid symbols ever get returned
    const validContacts = rawContacts.filter((c) => isValidContactName(c.name, c.phone));
    const invalidContacts = rawContacts.filter((c) => !isValidContactName(c.name, c.phone));

    // Auto-clean any invalid contacts in the background
    if (invalidContacts.length > 0) {
      const invalidIds = invalidContacts.map((c) => c.id);
      prisma.contactGroup.deleteMany({ where: { contactId: { in: invalidIds } } })
        .then(() => prisma.contact.deleteMany({ where: { id: { in: invalidIds } } }))
        .catch(() => {});
    }

    const res = NextResponse.json({
      contacts: validContacts,
      total: validContacts.length,
      page,
      totalPages: Math.ceil(validContacts.length / limit),
    });
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    return res;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDbSchemaSync();
    const body = await req.json().catch(() => ({}));

    if (body?.action === 'cleanup-invalid') {
      return cleanupInvalidHandler(req);
    }

    if (body?.action === 'cleanup-duplicates' || body?.action === 'cleanup') {
      return cleanupDuplicatesHandler(req);
    }

    const { name, phone, email, notes, groupIds } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { error: 'İsim ve telefon numarası zorunludur.' },
        { status: 400 }
      );
    }

    const normalized = normalizePhone(phone);

    const existing = await prisma.contact.findUnique({
      where: { phone: normalized },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Bu telefon numarası zaten kayıtlı.' },
        { status: 409 }
      );
    }

    const contact = await prisma.contact.create({
      data: {
        name: name.trim(),
        phone: normalized,
        email: email?.trim() || null,
        notes: notes?.trim() || null,
        groups: groupIds && Array.isArray(groupIds) && groupIds.length > 0
          ? {
              create: groupIds.map((groupId: string) => ({
                group: { connect: { id: groupId } },
              })),
            }
          : undefined,
      },
      include: {
        groups: {
          include: {
            group: true,
          },
        },
      },
    });

    // Also mirror into Subscriber
    await prisma.subscriber.create({
      data: {
        name: name.trim(),
        phone: normalized,
        email: email?.trim() || null,
        notes: notes?.trim() || null,
      }
    }).catch(() => {});

    return NextResponse.json({ success: true, contact }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
