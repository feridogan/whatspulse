import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get('groupId');
    const search = searchParams.get('search');

    const where: any = {};
    if (groupId) {
      where.groups = { some: { groupId } };
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const contacts = await prisma.contact.findMany({
      where,
      include: {
        groups: { include: { group: true } },
      },
      orderBy: { name: 'asc' },
    });

    const exportRows = contacts.map((c) => {
      const groupNames = c.groups.map((g) => g.group.name).join(', ');
      const custom = (c.customFields && typeof c.customFields === 'object') ? (c.customFields as Record<string, any>) : {};

      return {
        'Ad Soyad': c.name,
        'Telefon': c.phone,
        'E-Posta': c.email || '',
        'Gruplar': groupNames,
        'Durum': c.isBlacklisted ? 'Kara Liste' : 'Aktif',
        'Notlar': c.notes || '',
        'Kayıt Tarihi': new Date(c.createdAt).toLocaleDateString('tr-TR'),
        ...custom,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Kisiler');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="whatspulse-kisiler-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
