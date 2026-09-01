import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureDbSchemaSync } from "@/lib/db-sync";

export async function GET(req: NextRequest) {
  try {
    await ensureDbSchemaSync();

    const [totalMessages, sentMessages, failedMessages, recentLogs] = await Promise.all([
      prisma.message.count(),
      prisma.message.count({ where: { status: { in: ["SENT", "DELIVERED", "READ"] } } }),
      prisma.message.count({ where: { status: "FAILED" } }),
      prisma.message.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          campaign: { select: { title: true } },
          contact: { select: { name: true, phone: true } }
        }
      })
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        totalMessages,
        sentMessages,
        failedMessages,
        successRate: totalMessages > 0 ? ((sentMessages / totalMessages) * 100).toFixed(1) : "100.0"
      },
      recentLogs
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
