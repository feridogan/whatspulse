import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { normalizePhone } from '@/lib/utils';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const contact = await prisma.contact.findUnique({
      where: { id: params.id },
      include: {
        groups: {
          include: { group: true },
        },
        messages: {
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Kişi bulunamadı.' }, { status: 404 });
    }

    return NextResponse.json(contact);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { name, phone: rawPhone, email, notes, isBlacklisted, groupIds, customFields } = body;

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (rawPhone !== undefined) data.phone = normalizePhone(rawPhone);
    if (email !== undefined) data.email = email;
    if (notes !== undefined) data.notes = notes;
    if (isBlacklisted !== undefined) data.isBlacklisted = Boolean(isBlacklisted);
    if (customFields !== undefined) data.customFields = customFields;

    // Handle groups update
    if (Array.isArray(groupIds)) {
      await prisma.contactGroup.deleteMany({
        where: { contactId: params.id },
      });

      if (groupIds.length > 0) {
        data.groups = {
          create: groupIds.map((gId: string) => ({
            group: { connect: { id: gId } },
          })),
        };
      }
    }

    const updated = await prisma.contact.update({
      where: { id: params.id },
      data,
      include: {
        groups: {
          include: { group: true },
        },
      },
    });

    // If blacklisted state changed, sync with Blacklist table
    if (isBlacklisted !== undefined) {
      if (isBlacklisted) {
        await prisma.blacklist.upsert({
          where: { phone: updated.phone },
          update: { reason: 'Manuel engelleme' },
          create: { phone: updated.phone, reason: 'Manuel engelleme', addedBy: 'Admin' },
        });
      } else {
        await prisma.blacklist.deleteMany({
          where: { phone: updated.phone },
        });
      }
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.contact.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true, message: 'Kişi silindi.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
