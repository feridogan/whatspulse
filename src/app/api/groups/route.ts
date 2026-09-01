import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ensureDbSchemaSync } from '@/lib/db-sync';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await ensureDbSchemaSync();

    const groups = await prisma.group.findMany({
      include: {
        contacts: {
          include: {
            contact: true,
          },
        },
        subscribers: {
          include: {
            subscriber: true,
          },
        },
        _count: {
          select: {
            contacts: true,
            subscribers: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const mapped = groups.map((g) => {
      const activeCount = Math.max(
        g.contacts?.length || 0,
        g.subscribers?.length || 0,
        g._count?.contacts || 0,
        g._count?.subscribers || 0
      );
      return {
        ...g,
        memberCount: activeCount,
        _count: {
          contacts: activeCount,
          subscribers: activeCount,
        },
      };
    });

    return NextResponse.json(mapped);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDbSchemaSync();
    const { name, description, color } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Grup adı zorunludur.' }, { status: 400 });
    }

    const group = await prisma.group.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: color || '#10b981',
      },
      include: {
        contacts: true,
        subscribers: true,
        _count: {
          select: { contacts: true, subscribers: true },
        },
      },
    });

    return NextResponse.json({
      ...group,
      memberCount: 0,
      _count: { contacts: 0, subscribers: 0 },
    }, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Bu isimde bir grup zaten mevcut.' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
