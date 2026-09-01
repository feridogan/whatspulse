import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureDbSchemaSync } from "@/lib/db-sync";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await ensureDbSchemaSync();
    const orders = await prisma.order.findMany({
      include: {
        subscriber: { select: { id: true, name: true, phone: true, email: true, company: true } },
        domain: { select: { id: true, name: true, expiryDate: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json({ success: true, orders });
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
    const { subscriberId, domainId, title, amount, currency, status, items, validUntil, notes } = body;

    if (!title || amount === undefined) {
      return NextResponse.json({ success: false, error: "Başlık ve tutar zorunludur." }, { status: 400 });
    }

    const orderNumber = "DTS-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000);

    const order = await prisma.order.create({
      data: {
        orderNumber,
        subscriberId: subscriberId || undefined,
        domainId: domainId || undefined,
        title: title.trim(),
        amount: Number(amount),
        currency: currency || "TL",
        status: status || "PENDING",
        items: items || [],
        validUntil: validUntil ? new Date(validUntil) : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        notes: notes || null
      },
      include: {
        subscriber: true,
        domain: true
      }
    });

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
