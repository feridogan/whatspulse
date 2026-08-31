import { NextRequest, NextResponse } from 'next/server';
import { EvolutionService } from '@/lib/evolution';
import axios from 'axios';

export async function GET(req: NextRequest) {
  try {
    const adminKey = req.headers.get('x-admin-key');
    if (adminKey !== '16f54b4d7f24e095e8e88761f3bc993d863cafced9d6f99939824d28a206726a') {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
    }

    const config = {
      apiUrl: (process.env.EVOLUTION_API_URL || 'http://10.0.201.201:3800').replace(/\/+$/, ''),
      apiKey: process.env.EVOLUTION_GLOBAL_KEY || process.env.EVOLUTION_API_KEY || '16f54b4d7f24e095e8e88761f3bc993d863cafced9d6f99939824d28a206726a',
      instance: process.env.EVOLUTION_INSTANCE || 'ff',
    };

    const client = axios.create({
      baseURL: config.apiUrl,
      headers: { apikey: config.apiKey, 'Content-Type': 'application/json' },
      timeout: 15000,
    });

    const state = await EvolutionService.getConnectionState();

    // 1. Check if test numbers exist on WhatsApp
    let whatsappNumbersCheck = null;
    try {
      const numRes = await client.post(`/chat/whatsappNumbers/${config.instance}`, {
        numbers: ['905354581501', '905357953607', '905559742658'],
      });
      whatsappNumbersCheck = numRes.data;
    } catch (e: any) {
      whatsappNumbersCheck = { error: e.message, data: e.response?.data };
    }

    // 2. Fetch recent messages status from Evolution API
    let recentMessagesFromEvo = null;
    try {
      const msgRes = await client.post(`/chat/findMessages/${config.instance}`, {
        where: {
          key: {
            fromMe: true,
          },
        },
        take: 5,
      });
      recentMessagesFromEvo = msgRes.data;
    } catch (e: any) {
      recentMessagesFromEvo = { error: e.message, data: e.response?.data };
    }

    return NextResponse.json({
      state,
      config: {
        apiUrl: config.apiUrl,
        instance: config.instance,
      },
      whatsappNumbersCheck,
      recentMessagesFromEvo,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Reconnect action & Direct test
export async function POST(req: NextRequest) {
  try {
    const adminKey = req.headers.get('x-admin-key');
    if (adminKey !== '16f54b4d7f24e095e8e88761f3bc993d863cafced9d6f99939824d28a206726a') {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const testNumber = body.phone || '905357953607';
    const testText = body.text || `Test mesaji saat: ${new Date().toLocaleTimeString('tr-TR')}`;

    const config = {
      apiUrl: (process.env.EVOLUTION_API_URL || 'http://10.0.201.201:3800').replace(/\/+$/, ''),
      apiKey: process.env.EVOLUTION_GLOBAL_KEY || process.env.EVOLUTION_API_KEY || '16f54b4d7f24e095e8e88761f3bc993d863cafced9d6f99939824d28a206726a',
      instance: process.env.EVOLUTION_INSTANCE || 'ff',
    };

    const client = axios.create({
      baseURL: config.apiUrl,
      headers: { apikey: config.apiKey, 'Content-Type': 'application/json' },
      timeout: 15000,
    });

    // Test sendText
    const sendRes = await client.post(`/message/sendText/${config.instance}`, {
      number: testNumber,
      text: testText,
    });

    return NextResponse.json({
      success: true,
      sendResult: sendRes.data,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, data: error.response?.data }, { status: 500 });
  }
}
