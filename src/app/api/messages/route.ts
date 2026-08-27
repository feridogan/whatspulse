import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const phone = searchParams.get('phone');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (phone) where.phone = { contains: phone };

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        include: {
          contact: true,
          campaign: {
            select: { id: true, title: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.message.count({ where }),
    ]);

    // Aggregate stats
    const [totalSent, totalDelivered, totalRead, totalFailed] = await Promise.all([
      prisma.message.count({ where: { status: { in: ['SENT', 'DELIVERED', 'READ'] } } }),
      prisma.message.count({ where: { status: { in: ['DELIVERED', 'READ'] } } }),
      prisma.message.count({ where: { status: 'READ' } }),
      prisma.message.count({ where: { status: 'FAILED' } }),
    ]);

    return NextResponse.json({
      messages,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats: {
        totalSent,
        totalDelivered,
        totalRead,
        totalFailed,
        deliveryRate: totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) : '100.0',
        readRate: totalDelivered > 0 ? ((totalRead / totalDelivered) * 100).toFixed(1) : '0.0',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
