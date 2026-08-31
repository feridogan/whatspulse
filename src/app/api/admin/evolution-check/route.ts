import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req: NextRequest) {
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
      timeout: 20000,
    });

    // Step 1: Delete stale instance session
    try {
      await client.delete(`/instance/delete/${config.instance}`);
    } catch (e: any) {
      console.log('Delete instance notice:', e.message);
    }

    // Wait 1 second
    await new Promise(r => setTimeout(r, 1000));

    // Step 2: Create fresh instance with qrcode: true
    const createRes = await client.post('/instance/create', {
      instanceName: config.instance,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
    });

    const qrData = createRes.data?.qrcode?.base64 || createRes.data?.base64 || createRes.data?.qrcode || createRes.data?.code;

    return NextResponse.json({
      success: true,
      hasQr: Boolean(qrData),
      qrcode: qrData,
      data: createRes.data,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, data: error.response?.data }, { status: 500 });
  }
}
