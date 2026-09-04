import { NextRequest, NextResponse } from 'next/server';
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
      timeout: 20000,
    });

    // 0. Fetch Instances
    let instances = null;
    try {
      const res = await client.get('/instance/fetchInstances');
      instances = res.data;
    } catch (e: any) {
      instances = { error: e.message, data: e.response?.data };
    }

    // 1. Connection State
    let connectionState = null;
    try {
      const res = await client.get(`/instance/connectionState/${config.instance}`);
      connectionState = res.data;
    } catch (e: any) {
      connectionState = { error: e.message, data: e.response?.data };
    }

    // 2. findContacts POST with where: {}
    let contactsPost = null;
    try {
      const res = await client.post(`/chat/findContacts/${config.instance}`, { where: {} });
      const isArr = Array.isArray(res.data);
      const count = isArr ? res.data.length : (res.data?.length || res.data?.contacts?.length || Object.keys(res.data || {}).length);
      contactsPost = {
        status: res.status,
        isArray: isArr,
        count,
        sample: isArr ? res.data.slice(0, 3) : res.data,
      };
    } catch (e: any) {
      contactsPost = { error: e.message, data: e.response?.data };
    }

    // 3. findContacts GET
    let contactsGet = null;
    try {
      const res = await client.get(`/chat/findContacts/${config.instance}`);
      const isArr = Array.isArray(res.data);
      contactsGet = {
        status: res.status,
        isArray: isArr,
        count: isArr ? res.data.length : (res.data?.length || res.data?.contacts?.length || Object.keys(res.data || {}).length),
        sample: isArr ? res.data.slice(0, 3) : res.data,
      };
    } catch (e: any) {
      contactsGet = { error: e.message, data: e.response?.data };
    }

    // 4. findChats POST
    let chatsPost = null;
    try {
      const res = await client.post(`/chat/findChats/${config.instance}`, { where: {} });
      const isArr = Array.isArray(res.data);
      chatsPost = {
        status: res.status,
        isArray: isArr,
        count: isArr ? res.data.length : (res.data?.length || res.data?.chats?.length || Object.keys(res.data || {}).length),
        sample: isArr ? res.data.slice(0, 3) : res.data,
      };
    } catch (e: any) {
      chatsPost = { error: e.message, data: e.response?.data };
    }

    return NextResponse.json({
      config,
      instances,
      connectionState,
      contactsPost,
      contactsGet,
      chatsPost,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
