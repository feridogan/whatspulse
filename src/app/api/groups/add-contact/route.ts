import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ensureDbSchemaSync } from '@/lib/db-sync';

export async function POST(req: NextRequest) {
  try {
    await ensureDbSchemaSync();

    const body = await req.json();
    const { contactId, groupId } = body;

    if (!contactId || !groupId) {
      return NextResponse.json({ error: 'Kişi ID ve Grup ID zorunludur.' }, { status: 400 });
    }

    const [contact, group] = await Promise.all([
      prisma.contact.findUnique({ where: { id: contactId } }),
      prisma.group.findUnique({ where: { id: groupId } }),
    ]);

    if (!contact) {
      return NextResponse.json({ error: 'Kişi bulunamadı.' }, { status: 404 });
    }

    if (!group) {
      return NextResponse.json({ error: 'Grup bulunamadı.' }, { status: 404 });
    }

    const contactGroup = await prisma.contactGroup.upsert({
      where: {
        contactId_groupId: {
          contactId: contact.id,
          groupId: group.id,
        },
      },
      update: {},
      create: {
        contactId: contact.id,
        groupId: group.id,
      },
      include: {
        group: true,
        contact: true,
      },
    });

    return NextResponse.json({
      success: true,
      contactGroup,
      message: `"${contact.name}" "${group.name}" grubuna başarıyla eklendi.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
