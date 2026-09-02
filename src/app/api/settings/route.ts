import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { EvolutionService } from '@/lib/evolution';
import { requireAdmin } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authCheck = await requireAdmin(req);
    if (authCheck.error) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const settings = await prisma.setting.findMany();
    const settingsMap: Record<string, any> = {};

    settings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    return NextResponse.json({
      settings: settingsMap,
      ...settingsMap,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authCheck = await requireAdmin(req);
    if (authCheck.error) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const body = await req.json();
    const { key, value, action, settings: nestedSettings } = body;

    if (action === 'register_webhook') {
      const webhookUrl = value?.webhookUrl || `${process.env.APP_URL || 'https://mesaj.cakirlar.net'}/api/webhook/evolution`;
      const result = await EvolutionService.configureWebhook(webhookUrl);
      return NextResponse.json({ success: true, message: 'Webhook başarıyla kaydedildi!', result });
    }

    // 1. Single Key-Value save
    if (key && value !== undefined) {
      const setting = await prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
      return NextResponse.json({ success: true, setting });
    }

    // 2. Batch Settings Dictionary save
    const settingsToSave = nestedSettings || body;
    if (typeof settingsToSave === 'object' && settingsToSave !== null) {
      const entries = Object.entries(settingsToSave).filter(([k]) => k !== 'action');
      for (const [k, v] of entries) {
        if (v !== undefined) {
          await prisma.setting.upsert({
            where: { key: k },
            update: { value: v },
            create: { key: k, value: v },
          });
        }
      }
      return NextResponse.json({ success: true, message: 'Ayarlar başarıyla kaydedildi.' });
    }

    return NextResponse.json({ error: 'Kaydedilecek ayar bulunamadı.' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
