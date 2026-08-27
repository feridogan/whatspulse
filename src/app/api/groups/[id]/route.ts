import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const group = await prisma.group.findUnique({
      where: { id: params.id },
      include: {
        contacts: {
          include: { contact: true },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: 'Grup bulunamadı.' }, { status: 404 });
    }

    return NextResponse.json(group);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { name, description, color } = await req.json();

    const updated = await prisma.group.update({
      where: { id: params.id },
      data: {
        name: name ? name.trim() : undefined,
        description: description !== undefined ? description : undefined,
        color: color || undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.group.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true, message: 'Grup silindi.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
