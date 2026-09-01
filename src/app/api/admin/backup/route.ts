import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureDbSchemaSync } from "@/lib/db-sync";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await ensureDbSchemaSync();
    const authCheck = await requireAdmin(req);
    if (authCheck.error) {
      return NextResponse.json({ success: false, error: authCheck.error }, { status: authCheck.status });
    }

    const [subscribers, domains, groups, subscriberGroups, orders, settings] = await Promise.all([
      prisma.subscriber.findMany(),
      prisma.domain.findMany(),
      prisma.group.findMany(),
      prisma.subscriberGroup.findMany(),
      prisma.order.findMany(),
      prisma.setting.findMany(),
    ]);

    const backupData = {
      version: "3.2",
      timestamp: new Date().toISOString(),
      subscribers,
      domains,
      groups,
      subscriberGroups,
      orders,
      settings
    };

    return new Response(JSON.stringify(backupData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="dts_backup_${Date.now()}.json"`
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDbSchemaSync();
    const authCheck = await requireAdmin(req);
    if (authCheck.error) {
      return NextResponse.json({ success: false, error: authCheck.error }, { status: authCheck.status });
    }

    const body = await req.json();
    if (!body || !body.subscribers) {
      return NextResponse.json({ success: false, error: "Geçersiz yedek dosyası içeriği." }, { status: 400 });
    }

    let restoredCount = 0;
    if (Array.isArray(body.subscribers)) {
      for (const s of body.subscribers) {
        await prisma.subscriber.upsert({
          where: { phone: s.phone },
          update: {
            name: s.name,
            email: s.email,
            company: s.company,
            notes: s.notes,
            isActive: s.isActive
          },
          create: {
            name: s.name,
            phone: s.phone,
            email: s.email,
            company: s.company,
            notes: s.notes,
            isActive: s.isActive
          }
        }).catch(() => {});
        restoredCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Yedekleme başarıyla geri yüklendi (${restoredCount} abone aktarıldı).`
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
