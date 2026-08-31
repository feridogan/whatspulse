import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { normalizePhone, formatPhoneNumber } from '@/lib/utils';
import { ensureDbSchemaSync } from '@/lib/db-sync';

export async function GET(req: NextRequest) {
  try {
    await ensureDbSchemaSync();

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

// POST: Smart Upsert Contact & Safe Group Assignment
export async function POST(req: NextRequest) {
  try {
    await ensureDbSchemaSync();

    const body = await req.json();
    const { name, phone: rawPhone, email, notes, groupIds, customFields, isBlacklisted } = body;

    if (!rawPhone || !String(rawPhone).trim()) {
      return NextResponse.json({ error: 'Telefon numarası zorunludur.' }, { status: 400 });
    }

    const phone = formatPhoneNumber(String(rawPhone));
    if (!phone || phone.length < 10) {
      return NextResponse.json({ error: 'Geçersiz telefon numarası.' }, { status: 400 });
    }

    // 1. Check if contact exists to merge customFields and details
    const existing = await prisma.contact.findUnique({
      where: { phone },
    });

    const contactName = (name && String(name).trim()) 
      ? String(name).trim() 
      : (existing ? existing.name : `Kişi ${phone.slice(-4)}`);

    const contactEmail = email !== undefined 
      ? (email ? String(email).trim() : null) 
      : (existing?.email || null);

    const contactNotes = notes !== undefined 
      ? (notes ? String(notes).trim() : null) 
      : (existing?.notes || null);

    const mergedCustomFields = {
      ...(existing?.customFields && typeof existing.customFields === 'object' ? (existing.customFields as Record<string, any>) : {}),
      ...(customFields && typeof customFields === 'object' ? customFields : {}),
    };

    const isBlacklistState = isBlacklisted !== undefined ? Boolean(isBlacklisted) : (existing?.isBlacklisted || false);

    // 2. Perform Upsert
    const contact = await prisma.contact.upsert({
      where: { phone },
      update: {
        name: contactName,
        email: contactEmail,
        notes: contactNotes,
        isBlacklisted: isBlacklistState,
        customFields: mergedCustomFields,
      },
      create: {
        name: contactName,
        phone,
        email: contactEmail,
        notes: contactNotes,
        isBlacklisted: isBlacklistState,
        customFields: mergedCustomFields,
      },
      include: {
        groups: {
          include: { group: true },
        },
      },
    });

    // 3. Connect to Groups (Many-to-Many safe upsert)
    if (Array.isArray(groupIds) && groupIds.length > 0) {
      for (const gId of groupIds) {
        if (!gId) continue;
        await prisma.contactGroup.upsert({
          where: {
            contactId_groupId: {
              contactId: contact.id,
              groupId: gId,
            },
          },
          update: {},
          create: {
            contactId: contact.id,
            groupId: gId,
          },
        });
      }
    }

    // 4. Blacklist table synchronization
    if (isBlacklistState) {
      await prisma.blacklist.upsert({
        where: { phone },
        update: { reason: 'Manuel engelleme' },
        create: { phone, reason: 'Manuel engelleme', addedBy: 'Admin' },
      });
    }

    // Return the updated/created contact with all groups
    const finalContact = await prisma.contact.findUnique({
      where: { id: contact.id },
      include: {
        groups: {
          include: { group: true },
        },
      },
    });

    return NextResponse.json(finalContact || contact, { status: 200 });
  } catch (error: any) {
    console.error('Contact Upsert Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Bulk delete endpoint
export async function DELETE(req: NextRequest) {
  try {
    await ensureDbSchemaSync();

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
