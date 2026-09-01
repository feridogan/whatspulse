import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ensureDbSchemaSync } from '@/lib/db-sync';

export const dynamic = 'force-dynamic';

export const defaultTemplates = [
  {
    name: 'Cuma Tebriği',
    category: 'Dini Günler',
    content: 'Hayırlı Cumalar Sayın {ad} {soyad}. Cumanız mübarek, dualarınız kabul olsun. Sağlık ve huzur dolu bir gün dileriz. 🌿',
    mediaType: 'text',
    variables: ['ad', 'soyad'],
  },
  {
    name: 'Ramazan Bayramı',
    category: 'Dini Günler',
    content: 'Sayın {ad} Bey/Hanım, Ramazan Bayramınızı en içten dileklerimizle kutlar; aileniz ve sevdiklerinizle birlikte neşe dolu bir bayram geçirmenizi dileriz. 🍬',
    mediaType: 'text',
    variables: ['ad', 'soyad'],
  },
  {
    name: 'Kurban Bayramı',
    category: 'Dini Günler',
    content: 'Mübarek Kurban Bayramınızı kutlar, sevdiklerinizle bir arada sağlık, barış ve bereket dolu nice bayramlar dileriz, Sayın {ad}. 🐑',
    mediaType: 'text',
    variables: ['ad'],
  },
  {
    name: 'Kandil Mesajı (Mevlid / Regaip / Berat / Miraç)',
    category: 'Dini Günler',
    content: 'Kandiliniz mübarek olsun Sayın {ad}. Bu mübarek gecenin size ve ailenize sağlık, huzur ve hayırlar getirmesini temenni ederiz. 🤲',
    mediaType: 'text',
    variables: ['ad'],
  },
  {
    name: '29 Ekim Cumhuriyet Bayramı',
    category: 'Resmi Bayramlar',
    content: '29 Ekim Cumhuriyet Bayramımız kutlu olsun! Gazi Mustafa Kemal Atatürk ve silah arkadaşlarını saygı ve minnetle anıyoruz. 🇹🇷',
    mediaType: 'text',
    variables: ['ad'],
  },
  {
    name: '30 Ağustos Zafer Bayramı',
    category: 'Resmi Bayramlar',
    content: "Büyük Zafer'in yıl dönümünde, başta Gazi Mustafa Kemal Atatürk olmak üzere tüm kahramanlarımızı saygıyla anıyoruz. 30 Ağustos Zafer Bayramımız kutlu olsun. 🇹🇷",
    mediaType: 'text',
    variables: ['ad'],
  },
  {
    name: '23 Nisan Ulusal Egemenlik ve Çocuk Bayramı',
    category: 'Resmi Bayramlar',
    content: '23 Nisan Ulusal Egemenlik ve Çocuk Bayramı kutlu olsun! Geleceğimizin teminatı çocuklarımıza aydınlık yarınlar dileriz. 🎈',
    mediaType: 'text',
    variables: ['ad'],
  },
  {
    name: 'Yeni Yıl Tebriği',
    category: 'Genel / Özel Günler',
    content: 'Yeni yılın size ve tüm sevdiklerinize sağlık, başarı ve mutluluk getirmesini dileriz Sayın {ad}. Mutlu Yıllar! ✨',
    mediaType: 'text',
    variables: ['ad'],
  },
];

export async function GET(req: NextRequest) {
  try {
    await ensureDbSchemaSync();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');

    // 1. Ensure default library templates exist
    for (const tpl of defaultTemplates) {
      const existing = await prisma.template.findFirst({
        where: { name: tpl.name },
      });
      if (!existing) {
        await prisma.template.create({
          data: {
            name: tpl.name,
            content: tpl.content,
            mediaType: tpl.mediaType,
            variables: tpl.variables,
          },
        }).catch(() => {});
      }
    }

    const templates = await prisma.template.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(templates);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDbSchemaSync();
    const body = await req.json();
    const { name, content, mediaType, mediaUrl, variables } = body;

    if (!name || !content) {
      return NextResponse.json({ error: 'Şablon adı ve mesaj içeriği zorunludur.' }, { status: 400 });
    }

    let extractedVariables = Array.isArray(variables) ? variables : [];
    if (extractedVariables.length === 0) {
      const matches = content.match(/\{(\w+)\}/g);
      if (matches) {
        extractedVariables = Array.from(new Set(matches.map((m: string) => m.replace(/[{}]/g, ''))));
      }
    }

    const template = await prisma.template.create({
      data: {
        name: name.trim(),
        content: content.trim(),
        mediaType: mediaType || 'text',
        mediaUrl: mediaUrl || null,
        variables: extractedVariables,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
