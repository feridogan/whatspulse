import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureDbSchemaSync } from "@/lib/db-sync";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await ensureDbSchemaSync();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const filter = searchParams.get("filter") || "ALL"; // ALL, INTERACTIVE, ACTIVE, BLACKLIST
    const groupId = searchParams.get("groupId") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { email: { contains: search, mode: "insensitive" } },
        { company: { contains: search, mode: "insensitive" } },
      ];
    }

    if (filter === "INTERACTIVE") where.isInteractive = true;
    if (filter === "ACTIVE") where.isActive = true;
    if (filter === "BLACKLIST") where.isBlacklisted = true;

    if (groupId && groupId !== "ALL") {
      where.groups = {
        some: { groupId }
      };
    }

    const [subscribers, total] = await Promise.all([
      prisma.subscriber.findMany({
        where,
        include: {
          groups: {
            include: { group: true }
          },
          domains: {
            select: { id: true, name: true, expiryDate: true, status: true }
          },
          _count: {
            select: { domains: true, orders: true, notifications: true }
          }
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.subscriber.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      subscribers,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
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
    const { name, phone, email, company, notes, channels, preferredTime, language, groupIds, isActive, isInteractive } = body;

    if (!name || !phone) {
      return NextResponse.json({ success: false, error: "İsim ve telefon numarası zorunludur." }, { status: 400 });
    }

    let cleanPhone = "+" + phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      return NextResponse.json({ success: false, error: "Geçerli bir telefon numarası giriniz." }, { status: 400 });
    }

    const subscriber = await prisma.subscriber.upsert({
      where: { phone: cleanPhone },
      update: {
        name: name.trim(),
        email: email ? email.trim() : null,
        company: company ? company.trim() : null,
        notes: notes ? notes.trim() : null,
        channels: channels || ["WhatsApp"],
        preferredTime: preferredTime || "08:00",
        language: language || "TR",
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        isInteractive: isInteractive !== undefined ? Boolean(isInteractive) : false,
      },
      create: {
        name: name.trim(),
        phone: cleanPhone,
        email: email ? email.trim() : null,
        company: company ? company.trim() : null,
        notes: notes ? notes.trim() : null,
        channels: channels || ["WhatsApp"],
        preferredTime: preferredTime || "08:00",
        language: language || "TR",
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        isInteractive: isInteractive !== undefined ? Boolean(isInteractive) : false,
      }
    });

    // Also update Contact table for backward compatibility
    await prisma.contact.upsert({
      where: { phone: cleanPhone },
      update: { name: name.trim(), email: email || null, notes: notes || null },
      create: { name: name.trim(), phone: cleanPhone, email: email || null, notes: notes || null }
    }).catch(() => {});

    // Assign groups if provided
    if (Array.isArray(groupIds) && groupIds.length > 0) {
      for (const gId of groupIds) {
        await prisma.subscriberGroup.upsert({
          where: { subscriberId_groupId: { subscriberId: subscriber.id, groupId: gId } },
          update: {},
          create: { subscriberId: subscriber.id, groupId: gId }
        }).catch(() => {});
      }
    }

    const updated = await prisma.subscriber.findUnique({
      where: { id: subscriber.id },
      include: { groups: { include: { group: true } }, domains: true }
    });

    return NextResponse.json({ success: true, subscriber: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
