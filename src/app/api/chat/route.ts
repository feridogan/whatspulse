import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureDbSchemaSync } from "@/lib/db-sync";
import { EvolutionService } from "@/lib/evolution";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await ensureDbSchemaSync();
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");

    const where: any = {};
    if (phone) {
      const cleanPhone = "+" + phone.replace(/\D/g, "");
      where.phone = { contains: cleanPhone.replace("+", "") };
    }

    const messages = await prisma.message.findMany({
      where,
      include: {
        contact: true
      },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    return NextResponse.json({ success: true, messages });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDbSchemaSync();
    const authCheck = await requireAuth(req);
    if (authCheck.error) {
      return NextResponse.json({ success: false, error: authCheck.error }, { status: authCheck.status });
    }

    const body = await req.json();
    const { phone, content, mediaUrl, mediaType } = body;

    if (!phone || !content) {
      return NextResponse.json({ success: false, error: "Telefon ve mesaj metni gereklidir." }, { status: 400 });
    }

    const evoRes = await EvolutionService.sendMessage(phone, content, mediaUrl, mediaType);

    const savedMsg = await prisma.message.create({
      data: {
        phone: "+" + phone.replace(/\D/g, ""),
        content,
        mediaUrl: mediaUrl || null,
        mediaType: mediaType || "text",
        status: "SENT",
        evolutionMessageId: evoRes?.key?.id || null,
        sentAt: new Date(),
      }
    });

    return NextResponse.json({ success: true, message: savedMsg, evolutionResult: evoRes });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
