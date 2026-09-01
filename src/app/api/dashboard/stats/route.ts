import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureDbSchemaSync } from "@/lib/db-sync";
import { EvolutionService } from "@/lib/evolution";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await ensureDbSchemaSync();

    // 1. TOPLAM ABONE & AKTİF ABONE
    const [
      totalSubscribers,
      activeSubscribers,
      totalContacts,
      activeContacts
    ] = await Promise.all([
      prisma.subscriber.count().catch(() => 0),
      prisma.subscriber.count({ where: { isBlacklisted: false, isActive: true } }).catch(() => 0),
      prisma.contact.count().catch(() => 0),
      prisma.contact.count({ where: { isBlacklisted: false } }).catch(() => 0)
    ]);

    const finalTotalSubscribers = Math.max(totalSubscribers, totalContacts);
    const finalActiveSubscribers = Math.max(activeSubscribers, activeContacts);

    // 2. ETKİLEŞİMLİ ABONE
    const [interactiveSubscribers, interactiveContacts] = await Promise.all([
      prisma.subscriber.count({ where: { isInteractive: true } }).catch(() => 0),
      prisma.contact.count({
        where: {
          messages: {
            some: {
              status: { in: ["SENT", "DELIVERED", "READ"] }
            }
          }
        }
      }).catch(() => 0)
    ]);

    const finalInteractiveSubscribers = Math.max(interactiveSubscribers, interactiveContacts);

    // 3. İLETİLEN MESAJ & BUGÜN
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [
      sentMessages,
      sentNotifications,
      todaySentMessages,
      todaySentNotifications
    ] = await Promise.all([
      prisma.message.count({ where: { status: { in: ["SENT", "DELIVERED", "READ"] } } }).catch(() => 0),
      prisma.notificationLog.count({ where: { status: { in: ["SENT", "DELIVERED"] } } }).catch(() => 0),
      prisma.message.count({ where: { status: { in: ["SENT", "DELIVERED", "READ"] }, createdAt: { gte: startOfDay } } }).catch(() => 0),
      prisma.notificationLog.count({ where: { status: { in: ["SENT", "DELIVERED"] }, createdAt: { gte: startOfDay } } }).catch(() => 0)
    ]);

    const totalDelivered = sentMessages + sentNotifications;
    const todayDelivered = todaySentMessages + todaySentNotifications;

    // 4. BAŞARISIZ MESAJ
    const [failedMessages, failedNotifications] = await Promise.all([
      prisma.message.count({ where: { status: "FAILED" } }).catch(() => 0),
      prisma.notificationLog.count({ where: { status: "FAILED" } }).catch(() => 0)
    ]);

    const totalFailed = failedMessages + failedNotifications;

    // 5. BAŞARI ORANI
    const totalProcessed = totalDelivered + totalFailed;
    const successRate = totalProcessed > 0
      ? ((totalDelivered / totalProcessed) * 100).toFixed(2)
      : "100.00";

    // 6. WHATSAPP HATTI (ff)
    const evoState = await EvolutionService.getConnectionState("ff").catch(() => ({
      isOpen: false,
      state: "close"
    }));

    const isConnected = evoState.isOpen || evoState.state === "open" || evoState.state === "CONNECTED";

    // 7. SPAM & HAT RİSKİ
    const recentFailedCount = await prisma.message.count({
      where: {
        status: "FAILED",
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    }).catch(() => 0);

    const spamRisk = recentFailedCount === 0
      ? "DÜŞÜK (GÜVENLİ)"
      : recentFailedCount <= 3
      ? "ORTA (DİKKAT)"
      : "YÜKSEK (RİSKLİ)";

    return NextResponse.json({
      success: true,
      stats: {
        totalSubscribers: finalTotalSubscribers,
        activeSubscribers: finalActiveSubscribers,
        interactiveSubscribers: finalInteractiveSubscribers,
        totalDelivered,
        todayDelivered,
        totalFailed,
        successRate: parseFloat(successRate),
        whatsappConnected: isConnected,
        whatsappState: isConnected ? "BAĞLI (AÇIK)" : "KAPALI",
        spamRisk,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
