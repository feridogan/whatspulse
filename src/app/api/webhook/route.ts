import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureDbSchemaSync } from "@/lib/db-sync";
import { syncWhatsAppContactInfo } from "@/lib/contact-sync";
import { normalizePhoneNumber } from "@/lib/phone-utils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await ensureDbSchemaSync();
    const body = await req.json();

    const event = body.event || body.type;
    const data = body.data || body;

    // 1. Handle Messages (Incoming / Outgoing)
    if (
      event === "messages.upsert" ||
      event === "MESSAGES_UPSERT" ||
      event === "messages" ||
      data?.key?.remoteJid
    ) {
      const msgData = Array.isArray(data) ? data[0] : data;
      const remoteJid = msgData?.key?.remoteJid || msgData?.remoteJid;
      const fromMe = Boolean(msgData?.key?.fromMe);

      const normPhone = normalizePhoneNumber(remoteJid);

      if (normPhone) {
        const cleanPhone = normPhone;
        const formattedPhone = normPhone;

        const waName = msgData?.pushName || msgData?.verifiedBizName || null;
        const profilePicUrl = msgData?.profilePictureUrl || msgData?.profilePicUrl || null;

        // Extract message text
        const messageContent =
          msgData?.message?.conversation ||
          msgData?.message?.extendedTextMessage?.text ||
          msgData?.message?.imageMessage?.caption ||
          msgData?.message?.videoMessage?.caption ||
          msgData?.content ||
          "";

        // Find or create contact
        let contact = await prisma.contact.findFirst({
          where: {
            phone: cleanPhone,
          },
        });

        if (!contact) {
          contact = await prisma.contact.create({
            data: {
              phone: cleanPhone,
              name: waName || formattedPhone,
              avatar: profilePicUrl || null,
              isCustomName: false,
            },
          });
        } else {
          // Apply User WhatsApp Contact Sync logic:
          await syncWhatsAppContactInfo(contact, { waName, profilePicUrl });
        }

        // Save incoming message if not fromMe
        if (!fromMe && messageContent) {
          // Check Opt-Out / Blacklist keywords
          const upper = messageContent.trim().toUpperCase();
          if (["IPTAL", "İPTAL", "STOP", "CIKIS", "ÇIKIŞ", "ENGELLE"].includes(upper)) {
            await prisma.blacklist.upsert({
              where: { phone: cleanPhone },
              update: { reason: `Gelen Mesaj Talebi: ${upper}` },
              create: {
                phone: cleanPhone,
                reason: `Gelen Mesaj Talebi: ${upper}`,
                addedBy: "Auto-Keyword",
              },
            });
            await prisma.contact.update({
              where: { id: contact.id },
              data: { isBlacklisted: true },
            });
            await prisma.subscriber.updateMany({
              where: { phone: cleanPhone },
              data: { isBlacklisted: true },
            });
          }

          // Save Message to DB
          await prisma.message.create({
            data: {
              phone: cleanPhone,
              contactId: contact.id,
              content: messageContent,
              status: "READ",
              sentAt: new Date(),
            },
          });
        }
      }
    }

    // 2. Handle Contacts Upsert / Sync
    if (
      event === "contacts.upsert" ||
      event === "contacts.update" ||
      event === "CONTACTS_UPSERT"
    ) {
      const contactsList = Array.isArray(data) ? data : [data];
      for (const item of contactsList) {
        const remoteJid = item?.id || item?.remoteJid || item?.jid;
        if (remoteJid && !remoteJid.includes("@g.us")) {
          const rawDigits = remoteJid.split("@")[0].replace(/:.*$/, "").replace(/\D/g, "");
          const cleanPhone = normalizePhone(rawDigits);
          const formattedPhone = formatPhoneNumber(rawDigits);
          const waName = item?.pushName || item?.name || item?.verifiedName || null;
          const profilePicUrl = item?.profilePictureUrl || item?.profilePicUrl || null;

          const contact = await prisma.contact.findFirst({
            where: {
              OR: [
                { phone: cleanPhone },
                { phone: formattedPhone },
                { phone: rawDigits },
              ],
            },
          });

          if (contact) {
            await syncWhatsAppContactInfo(contact, { waName, profilePicUrl });
          } else if (cleanPhone) {
            await prisma.contact.create({
              data: {
                phone: cleanPhone,
                name: waName || formattedPhone,
                avatar: profilePicUrl || null,
                isCustomName: false,
              },
            });
          }
        }
      }
    }

    return NextResponse.json({ success: true, message: "Webhook processed" });
  } catch (error: any) {
    console.error("[Webhook Error]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ success: true, message: "WhatsPulse WhatsApp Webhook Active" });
}
