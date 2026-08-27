import { NextRequest, NextResponse } from 'next/server';
import { EvolutionService } from '@/lib/evolution';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const webhookUrl = body.url || body.webhookUrl || `${process.env.APP_URL || 'https://mesaj.cakirlar.net'}/api/webhook/evolution`;
    const result = await EvolutionService.configureWebhook(webhookUrl);
    return NextResponse.json({ success: true, message: 'Webhook başarıyla tanımlandı', result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Webhook tanımlanamadı' }, { status: 400 });
  }
}
