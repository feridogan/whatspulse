import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureDbSchemaSync } from "@/lib/db-sync";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureDbSchemaSync();
    const domain = await prisma.domain.findUnique({
      where: { id: params.id },
      include: {
        subscriber: true,
        orders: true,
        notifications: { orderBy: { sentAt: "desc" }, take: 10 }
      }
    });
    if (!domain) {
      return NextResponse.json({ success: false, error: "Alan adı bulunamadı." }, { status: 404 });
    }
    return NextResponse.json({ success: true, domain });
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

    await prisma.domain.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true, message: "Alan adı başarıyla silindi." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
