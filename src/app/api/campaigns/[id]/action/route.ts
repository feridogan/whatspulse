import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { action } = await req.json();

    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Kampanya bulunamadı.' }, { status: 404 });
    }

    let newStatus = campaign.status;

    if (action === 'pause') {
      newStatus = 'PAUSED';
    } else if (action === 'resume') {
      newStatus = 'PROCESSING';
    } else if (action === 'cancel') {
      newStatus = 'CANCELLED';
      // Immediately cancel all queued messages in DB
      await prisma.message.updateMany({
        where: {
          campaignId: params.id,
          status: 'QUEUED',
        },
        data: {
          status: 'FAILED',
          errorMessage: 'Kampanya kullanıcı tarafından durduruldu / iptal edildi',
        },
      });
    } else {
      return NextResponse.json({ error: 'Geçersiz aksiyon (pause, resume, cancel)' }, { status: 400 });
    }

    const updated = await prisma.campaign.update({
      where: { id: params.id },
      data: { 
        status: newStatus,
        completedAt: newStatus === 'CANCELLED' ? new Date() : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      campaign: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
