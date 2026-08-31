import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { parseVCard, ParsedContact } from '@/lib/vcard-parser';
import { parseExcelBuffer } from '@/lib/excel-parser';
import { normalizePhone, formatPhoneNumber } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let contactsToImport: ParsedContact[] = [];
    let targetGroupId: string | null = null;
    let newGroupName: string | null = null;

    if (contentType.includes('application/json')) {
      const body = await req.json();
      targetGroupId = body.groupId || null;
      newGroupName = body.newGroupName ? body.newGroupName.trim() : null;

      if (Array.isArray(body.contacts)) {
        contactsToImport = body.contacts.map((c: any) => ({
          name: (c.name || c.ad || c.isim || '').trim(),
          phone: c.phone || c.tel || c.telefon || c.gsm || '',
          email: c.email || c.eposta || undefined,
          notes: c.notes || c.note || c.not || undefined,
          customFields: c.customFields || undefined,
        }));
      }
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      targetGroupId = (formData.get('groupId') as string) || null;
      newGroupName = (formData.get('newGroupName') as string) || null;

      if (!file) {
        return NextResponse.json({ error: 'Lütfen yüklenecek bir dosya seçin.' }, { status: 400 });
      }

      const fileName = file.name.toLowerCase();
      const buffer = Buffer.from(await file.arrayBuffer());

      if (fileName.endsWith('.vcf') || fileName.endsWith('.vcard')) {
        const text = buffer.toString('utf-8');
        contactsToImport = parseVCard(text);
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
        contactsToImport = parseExcelBuffer(buffer);
      } else {
        return NextResponse.json({
          error: 'Desteklenmeyen dosya formatı. Lütfen .xlsx, .xls, .csv veya .vcf dosyası yükleyin.',
        }, { status: 400 });
      }
    }

    if (contactsToImport.length === 0) {
      return NextResponse.json({ error: 'İçe aktarılacak geçerli kişi kaydı bulunamadı.' }, { status: 400 });
    }

    // If newGroupName is provided, create the group first
    if (newGroupName && !targetGroupId) {
      const createdGroup = await prisma.group.upsert({
        where: { name: newGroupName },
        update: {},
        create: {
          name: newGroupName,
          description: 'Dosya aktarımı ile oluşturuldu',
          color: '#10b981',
        },
      });
      targetGroupId = createdGroup.id;
    }

    let addedCount = 0;
    let updatedCount = 0;
    let skippedInvalidCount = 0;
    let duplicateInFileCount = 0;

    const seenPhonesInFile = new Set<string>();

    for (const c of contactsToImport) {
      const rawPhone = String(c.phone || '').trim();
      const cleanDigits = normalizePhone(rawPhone);
      const phone = formatPhoneNumber(cleanDigits);

      if (!cleanDigits || cleanDigits.length < 10 || cleanDigits.length > 14) {
        skippedInvalidCount++;
        continue;
      }

      if (seenPhonesInFile.has(phone)) {
        duplicateInFileCount++;
        continue;
      }
      seenPhonesInFile.add(phone);

      const contactName = c.name ? c.name.trim() : `Kişi ${phone.slice(-4)}`;
      const email = c.email ? String(c.email).trim() : null;
      const notes = c.notes ? String(c.notes).trim() : null;
      const customFields = c.customFields && typeof c.customFields === 'object' ? c.customFields : {};

      const existing = await prisma.contact.findUnique({
        where: { phone },
      });

      if (existing) {
        const mergedCustomFields = {
          ...(existing.customFields && typeof existing.customFields === 'object' ? (existing.customFields as Record<string, any>) : {}),
          ...customFields,
        };

        await prisma.contact.update({
          where: { id: existing.id },
          data: {
            name: c.name ? contactName : existing.name,
            email: email || existing.email,
            notes: notes ? (existing.notes ? `${existing.notes} | ${notes}` : notes) : existing.notes,
            customFields: mergedCustomFields,
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
            name: contactName,
            phone,
            email,
            notes,
            customFields,
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
      message: `${addedCount} yeni kişi eklendi, ${updatedCount} mevcut kişi güncellendi.`,
      addedCount,
      updatedCount,
      skippedInvalidCount,
      duplicateInFileCount,
      totalProcessed: contactsToImport.length,
      targetGroupId,
    });
  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'İçe aktarma sırasında hata oluştu: ' + error.message }, { status: 500 });
  }
}
