import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const groups = await prisma.group.findMany({
      include: {
        _count: {
          select: { contacts: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(groups);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, description, color } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Grup adı zorunludur.' }, { status: 400 });
    }

    const group = await prisma.group.create({
      data: {
        name: name.trim(),
        description: description || null,
        color: color || '#10b981',
      },
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Bu isimde bir grup zaten mevcut.' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
