import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
      include: {
        template: true,
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 200,
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Kampanya bulunamadı.' }, { status: 404 });
    }

    return NextResponse.json(campaign);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.campaign.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true, message: 'Kampanya silindi.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
