import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureDbSchemaSync } from "@/lib/db-sync";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureDbSchemaSync();
    const subscriber = await prisma.subscriber.findUnique({
      where: { id: params.id },
      include: {
        groups: { include: { group: true } },
        domains: true,
        orders: true,
        notifications: { orderBy: { sentAt: "desc" }, take: 10 }
      }
    });
    if (!subscriber) {
      return NextResponse.json({ success: false, error: "Abone bulunamadı." }, { status: 404 });
    }
    return NextResponse.json({ success: true, subscriber });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureDbSchemaSync();
    const authCheck = await requireAuth(req);
    if (authCheck.error) {
      return NextResponse.json({ success: false, error: authCheck.error }, { status: authCheck.status });
    }

    await prisma.subscriber.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true, message: "Abone başarıyla silindi." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
