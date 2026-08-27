import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';

    const where: any = {};
    if (search) {
      where.OR = [
        { contactName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { lastMessage: { contains: search, mode: 'insensitive' } },
      ];
    }

    const chats = await prisma.chat.findMany({
      where,
      orderBy: { lastMessageTime: 'desc' },
      take: 100,
    });

    return NextResponse.json(chats);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
