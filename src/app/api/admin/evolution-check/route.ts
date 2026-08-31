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

    let instances = null;
    try {
      const res = await client.get('/instance/fetchInstances');
      instances = res.data;
    } catch (e: any) {
      instances = { error: e.message, data: e.response?.data };
    }

    let connectionState = null;
    try {
      const res = await client.get(`/instance/connectionState/${config.instance}`);
      connectionState = res.data;
    } catch (e: any) {
      connectionState = { error: e.message, data: e.response?.data };
    }

    return NextResponse.json({
      config,
      instances,
      connectionState,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
