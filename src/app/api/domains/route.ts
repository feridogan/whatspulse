import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureDbSchemaSync } from "@/lib/db-sync";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await ensureDbSchemaSync();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "ALL";

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { subscriber: { name: { contains: search, mode: "insensitive" } } },
        { subscriber: { phone: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (status !== "ALL") {
      where.status = status;
    }

    const domains = await prisma.domain.findMany({
      where,
      include: {
        subscriber: {
          select: { id: true, name: true, phone: true, email: true, company: true }
        },
        _count: {
          select: { orders: true, notifications: true }
        }
      },
      orderBy: { expiryDate: "asc" }
    });

    return NextResponse.json({ success: true, domains });
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
    const { name, subscriberId, registrar, expiryDate, sslExpiryDate, autoRenew, price, currency, notes } = body;

    if (!name || !expiryDate) {
      return NextResponse.json({ success: false, error: "Alan adı ve bitiş tarihi zorunludur." }, { status: 400 });
    }

    const cleanName = name.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");

    const domain = await prisma.domain.upsert({
      where: { name: cleanName },
      update: {
        subscriberId: subscriberId || undefined,
        registrar: registrar || "METUNIC",
        expiryDate: new Date(expiryDate),
        sslExpiryDate: sslExpiryDate ? new Date(sslExpiryDate) : undefined,
        autoRenew: Boolean(autoRenew),
        price: price ? Number(price) : 250,
        currency: currency || "TL",
        notes: notes || null,
      },
      create: {
        name: cleanName,
        subscriberId: subscriberId || undefined,
        registrar: registrar || "METUNIC",
        expiryDate: new Date(expiryDate),
        sslExpiryDate: sslExpiryDate ? new Date(sslExpiryDate) : undefined,
        autoRenew: Boolean(autoRenew),
        price: price ? Number(price) : 250,
        currency: currency || "TL",
        notes: notes || null,
      },
      include: {
        subscriber: true
      }
    });

    return NextResponse.json({ success: true, domain });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
