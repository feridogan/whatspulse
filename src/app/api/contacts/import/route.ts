import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { parseVCard, ParsedContact } from '@/lib/vcard-parser';
import { parseExcelBuffer } from '@/lib/excel-parser';
import { normalizePhone } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let contactsToImport: ParsedContact[] = [];
    let targetGroupId: string | null = null;

    if (contentType.includes('application/json')) {
      const body = await req.json();
      targetGroupId = body.groupId || null;

      if (Array.isArray(body.contacts)) {
        contactsToImport = body.contacts.map((c: any) => ({
          name: c.name || `Kişi ${String(c.phone || c.tel || '').slice(-4)}`,
          phone: normalizePhone(c.phone || c.tel || ''),
          email: c.email || undefined,
          notes: c.notes || c.note || undefined,
          customFields: c.customFields || undefined,
        }));
      }
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      targetGroupId = (formData.get('groupId') as string) || null;

      if (!file) {
        return NextResponse.json({ error: 'Dosya yüklenmedi.' }, { status: 400 });
      }

      const fileName = file.name.toLowerCase();
      const buffer = Buffer.from(await file.arrayBuffer());

      if (fileName.endsWith('.vcf') || fileName.endsWith('.vcard')) {
        const text = buffer.toString('utf-8');
        contactsToImport = parseVCard(text);
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
        contactsToImport = parseExcelBuffer(buffer);
      } else {
        return NextResponse.json({ error: 'Desteklenmeyen dosya formatı. Lütfen .vcf, .xlsx, .xls veya .csv yükleyin.' }, { status: 400 });
      }
    }

    if (contactsToImport.length === 0) {
      return NextResponse.json({ error: 'İçe aktarılacak geçerli kişi bulunamadı.' }, { status: 400 });
    }

    let addedCount = 0;
    let updatedCount = 0;

    for (const c of contactsToImport) {
      const phone = formatPhoneNumber(c.phone);
      if (!phone || phone.length < 10) continue;

      const existing = await prisma.contact.findUnique({
        where: { phone },
      });

      if (existing) {
        await prisma.contact.update({
          where: { id: existing.id },
          data: {
            name: c.name || existing.name,
            email: c.email || existing.email,
            notes: c.notes ? (existing.notes ? `${existing.notes} | ${c.notes}` : c.notes) : existing.notes,
            customFields: c.customFields || existing.customFields || {},
          },
        });

        if (targetGroupId) {
          await prisma.contactGroup.upsert({
            where: {
              contactId_groupId: {
                contactId: existing.id,
                groupId: targetGroupId,
              },
            },
            update: {},
            create: {
              contactId: existing.id,
              groupId: targetGroupId,
            },
          });
        }
        updatedCount++;
      } else {
        const created = await prisma.contact.create({
          data: {
            name: c.name || `Kişi ${phone.slice(-4)}`,
            phone,
            email: c.email || null,
            notes: c.notes || null,
            customFields: c.customFields || {},
          },
        });

        if (targetGroupId) {
          await prisma.contactGroup.create({
            data: {
              contactId: created.id,
              groupId: targetGroupId,
            },
          });
        }
        addedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `${addedCount} yeni kişi eklendi, ${updatedCount} kişi güncellendi.`,
      addedCount,
      updatedCount,
      totalProcessed: contactsToImport.length,
    });
  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'İçe aktarma sırasında hata: ' + error.message }, { status: 500 });
  }
}
