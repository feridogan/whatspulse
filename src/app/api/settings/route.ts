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

    return NextResponse.json(settingsMap);
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
    const { key, value, action } = body;

    if (action === 'register_webhook') {
      const webhookUrl = value?.webhookUrl || `${process.env.APP_URL || 'https://mesaj.cakirlar.net'}/api/webhook/evolution`;
      const result = await EvolutionService.configureWebhook(webhookUrl);
      return NextResponse.json({ success: true, message: 'Webhook başarıyla kaydedildi!', result });
    }

    if (!key || value === undefined) {
      return NextResponse.json({ error: 'Key ve value gereklidir.' }, { status: 400 });
    }

    const setting = await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    return NextResponse.json({ success: true, setting });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
