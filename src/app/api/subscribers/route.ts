import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureDbSchemaSync } from "@/lib/db-sync";
import { requireAuth } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await ensureDbSchemaSync();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const filter = searchParams.get("filter") || "ALL"; // ALL, INTERACTIVE, ACTIVE, BLACKLIST
    const groupId = searchParams.get("groupId") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10000", 10);

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

    let [subscribers, total] = await Promise.all([
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
        orderBy: { name: "asc" },
        skip: limit >= 10000 ? 0 : (page - 1) * limit,
        take: limit,
      }),
      prisma.subscriber.count({ where }),
    ]);

    // If Subscriber table is empty or has fewer contacts, mirror from Contact
    if (subscribers.length === 0 && !search && filter === 'ALL' && (!groupId || groupId === 'ALL')) {
      const contacts = await prisma.contact.findMany({
        orderBy: { name: "asc" },
        include: {
          groups: {
            include: { group: true }
          }
        }
      });
      if (contacts.length > 0) {
        subscribers = contacts as any;
        total = contacts.length;
      }
    }

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
    const { 
      name, 
      phone, 
      email, 
      company, 
      notes, 
      categories, 
      contentDetails, 
      preferredTime, 
      language, 
      groupIds, 
      isActive, 
      isInteractive 
    } = body;

    if (!name || !phone) {
      return NextResponse.json({ success: false, error: "İsim ve telefon numarası zorunludur." }, { status: 400 });
    }

    const cleanPhone = phone.replace(/[^\d+]/g, "");

    const subscriber = await prisma.subscriber.upsert({
      where: { phone: cleanPhone },
      update: {
        name,
        email: email || null,
        company: company || null,
        notes: notes || null,
        preferredTime: preferredTime || "08:00",
        language: language || "TR",
        isActive: isActive !== undefined ? isActive : true,
        isInteractive: isInteractive || false,
      },
      create: {
        name,
        phone: cleanPhone,
        email: email || null,
        company: company || null,
        notes: notes || null,
        preferredTime: preferredTime || "08:00",
        language: language || "TR",
        isActive: isActive !== undefined ? isActive : true,
        isInteractive: isInteractive || false,
      }
    });

    // Also mirror to Contact table
    await prisma.contact.upsert({
      where: { phone: cleanPhone },
      update: { name, email: email || null, notes: notes || null },
      create: { name, phone: cleanPhone, email: email || null, notes: notes || null }
    }).catch(() => {});

    // Update group mappings if provided
    if (groupIds && Array.isArray(groupIds)) {
      await prisma.subscriberGroup.deleteMany({
        where: { subscriberId: subscriber.id }
      });

      for (const gId of groupIds) {
        await prisma.subscriberGroup.create({
          data: { subscriberId: subscriber.id, groupId: gId }
        }).catch(() => {});
      }
    }

    return NextResponse.json({
      success: true,
      subscriber,
      message: "Abone başarıyla kaydedildi."
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
