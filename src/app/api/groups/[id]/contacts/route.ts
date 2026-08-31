import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET: List all contacts in a specific group
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const group = await prisma.group.findUnique({
      where: { id: params.id },
      include: {
        contacts: {
          include: { contact: true },
          orderBy: { contact: { name: 'asc' } },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: 'Grup bulunamadı.' }, { status: 404 });
    }

    const members = group.contacts.map((cg) => cg.contact);
    return NextResponse.json({ group, contacts: members });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Add one or more contacts to this group (Many-to-Many safe assignment)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { contactIds } = await req.json();
    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json({ error: 'Eklenecek kişi listesi zorunludur.' }, { status: 400 });
    }

    const group = await prisma.group.findUnique({
      where: { id: params.id },
    });

    if (!group) {
      return NextResponse.json({ error: 'Grup bulunamadı.' }, { status: 404 });
    }

    const entries = contactIds.map((cId: string) => ({
      contactId: cId,
      groupId: params.id,
    }));

    await prisma.contactGroup.createMany({
      data: entries,
      skipDuplicates: true,
    });

    return NextResponse.json({
      success: true,
      message: `${contactIds.length} kişi "${group.name}" grubuna başarıyla eklendi.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Remove one or more contacts from this group (Does NOT delete contact records)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { contactIds } = await req.json();
    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json({ error: 'Gruptan çıkarılacak kişi listesi zorunludur.' }, { status: 400 });
    }

    const result = await prisma.contactGroup.deleteMany({
      where: {
        groupId: params.id,
        contactId: { in: contactIds },
      },
    });

    return NextResponse.json({
      success: true,
      count: result.count,
      message: `${result.count} kişi gruptan çıkarıldı (Kişi kayıtları rehberde korundu).`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
