import { NextRequest, NextResponse } from 'next/server';
import { EvolutionService } from '@/lib/evolution';
import axios from 'axios';

export async function GET(req: NextRequest) {
  try {
    const adminKey = req.headers.get('x-admin-key');
    if (adminKey !== '16f54b4d7f24e095e8e88761f3bc993d863cafced9d6f99939824d28a206726a') {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
    }

    const state = await EvolutionService.getConnectionState();

    // Also get detailed instance info from Evolution API
    const config = {
      apiUrl: process.env.EVOLUTION_API_URL || 'http://10.0.201.201:3800',
      apiKey: process.env.EVOLUTION_GLOBAL_KEY || process.env.EVOLUTION_API_KEY || '16f54b4d7f24e095e8e88761f3bc993d863cafced9d6f99939824d28a206726a',
      instance: process.env.EVOLUTION_INSTANCE || 'ff',
    };

    let instanceDetails = null;
    let fetchInstances = null;
    try {
      const detailRes = await axios.get(`${config.apiUrl}/instance/fetchInstances`, {
        headers: { apikey: config.apiKey },
        timeout: 10000,
      });
      fetchInstances = detailRes.data;
    } catch (e: any) {
      instanceDetails = { error: e.message, data: e.response?.data };
    }

    return NextResponse.json({
      state,
      config: {
        apiUrl: config.apiUrl,
        instance: config.instance,
      },
      fetchInstances,
      instanceDetails,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Reconnect action
export async function POST(req: NextRequest) {
  try {
    const adminKey = req.headers.get('x-admin-key');
    if (adminKey !== '16f54b4d7f24e095e8e88761f3bc993d863cafced9d6f99939824d28a206726a') {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
    }

    const config = {
      apiUrl: process.env.EVOLUTION_API_URL || 'http://10.0.201.201:3800',
      apiKey: process.env.EVOLUTION_GLOBAL_KEY || process.env.EVOLUTION_API_KEY || '16f54b4d7f24e095e8e88761f3bc993d863cafced9d6f99939824d28a206726a',
      instance: process.env.EVOLUTION_INSTANCE || 'ff',
    };

    const res = await axios.get(`${config.apiUrl}/instance/connect/${config.instance}`, {
      headers: { apikey: config.apiKey },
      timeout: 15000,
    });

    return NextResponse.json({
      success: true,
      data: res.data,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, data: error.response?.data }, { status: 500 });
  }
}
