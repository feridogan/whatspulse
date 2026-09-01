import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureDbSchemaSync } from "@/lib/db-sync";
import { EvolutionService } from "@/lib/evolution";
import { requireAuth } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await ensureDbSchemaSync();
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");
    const search = searchParams.get("search")?.toLowerCase().trim() || "";

    // 1. Fetch recent messages
    const where: any = {};
    if (phone) {
      const cleanPhone = phone.replace(/[^\d+]/g, "");
      where.phone = { contains: cleanPhone.replace("+", "") };
    }

    const messages = await prisma.message.findMany({
      where,
      include: {
        contact: true
      },
      orderBy: { createdAt: "asc" },
      take: 200
    });

    // 2. Build distinct active conversations based ONLY on real messages
    const allRecentMessages = await prisma.message.findMany({
      include: { contact: true },
      orderBy: { createdAt: "desc" },
      take: 1000
    });

    const conversationMap = new Map<string, any>();

    for (const msg of allRecentMessages) {
      const cleanP = msg.phone.replace(/[^\d+]/g, "");
      if (!conversationMap.has(cleanP)) {
        conversationMap.set(cleanP, {
          phone: cleanP,
          name: msg.contact?.name || cleanP,
          lastMessage: msg.content,
          lastMessageAt: msg.createdAt,
          status: msg.status,
          isIncoming: false
        });
      }
    }

    // If search term is present and no conversation matched, also search in Contact/Subscriber table
    let searchResults: any[] = [];
    if (search && search.length >= 2) {
      const matchedContacts = await prisma.contact.findMany({
        where: {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { phone: { contains: search } },
            { email: { contains: search, mode: "insensitive" } }
          ]
        },
        take: 20
      });

      searchResults = matchedContacts.map(c => ({
        phone: c.phone,
        name: c.name,
        lastMessage: "Yeni Sohbet Başlat",
        lastMessageAt: c.createdAt,
        isSearchMatch: true
      }));
    }

    const conversations = Array.from(conversationMap.values()).sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );

    return NextResponse.json({
      success: true,
      messages,
      conversations,
      searchResults
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
    const { phone, content, mediaUrl, mediaType } = body;

    if (!phone || !content) {
      return NextResponse.json({ success: false, error: "Telefon ve mesaj metni gereklidir." }, { status: 400 });
    }

    const cleanPhone = phone.replace(/[^\d+]/g, "");

    // Send via Evolution API
    const evoRes = await EvolutionService.sendMessage(cleanPhone, content, mediaUrl, mediaType).catch((err) => {
      console.warn("Evolution API send warning:", err.message);
      return null;
    });

    // Check if Contact exists to connect
    const contact = await prisma.contact.findUnique({
      where: { phone: cleanPhone }
    }).catch(() => null);

    const savedMsg = await prisma.message.create({
      data: {
        phone: cleanPhone,
        content,
        mediaUrl: mediaUrl || null,
        mediaType: mediaType || "text",
        status: "SENT",
        contactId: contact?.id || null,
        evolutionMessageId: evoRes?.key?.id || null,
        sentAt: new Date(),
      },
      include: {
        contact: true
      }
    });

    return NextResponse.json({ success: true, message: savedMsg, evolutionResult: evoRes });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
