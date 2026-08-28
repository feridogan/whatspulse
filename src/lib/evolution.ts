import axios, { AxiosInstance } from 'axios';
import https from 'https';
import prisma from './prisma';
import { normalizePhone } from './utils';

export interface EvolutionConfig {
  apiUrl: string;
  instanceName: string;
  instanceKey: string;
  globalApiKey: string;
}

export async function getEvolutionConfig(): Promise<EvolutionConfig> {
  let apiUrl = process.env.EVOLUTION_API_URL || 'https://evo-rc.cakirlar.net';
  let instanceName = process.env.EVOLUTION_INSTANCE || 'feridun';
  let instanceKey = process.env.EVOLUTION_API_KEY || '11E1F8329577-40D3-B891-9CCA41C01658';
  let globalApiKey = process.env.EVOLUTION_GLOBAL_KEY || process.env.EVOLUTION_API_KEY || '4a8f9c2d1e0b3a5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f';

  try {
    const setting = await prisma.setting.findUnique({
      where: { key: 'evolution_api' },
    });
    if (setting && typeof setting.value === 'object') {
      const val = setting.value as any;
      if (val.apiUrl) apiUrl = val.apiUrl;
      if (val.instanceName) instanceName = val.instanceName;
      if (val.instanceKey) instanceKey = val.instanceKey;
      if (val.globalApiKey) globalApiKey = val.globalApiKey;
    }
  } catch (err) {
    // Database might not be ready yet during early boot
  }

  // Ensure globalApiKey is never empty, fallback to env or global default
  if (!globalApiKey || globalApiKey === 'undefined') {
    globalApiKey = process.env.EVOLUTION_GLOBAL_KEY || process.env.EVOLUTION_API_KEY || '4a8f9c2d1e0b3a5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f';
  }

  // Clean trailing slash
  apiUrl = apiUrl.replace(/\/$/, '');

  return { apiUrl, instanceName, instanceKey, globalApiKey };
}

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
});

async function getClient(customInstance?: string): Promise<{ client: AxiosInstance; instance: string }> {
  const config = await getEvolutionConfig();
  const targetInstance = customInstance?.trim() || config.instanceName;
  // Evolution API v2: apikey header uses globalApiKey or instanceKey
  const apiKey = config.globalApiKey || config.instanceKey || '4a8f9c2d1e0b3a5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f';

  const client = axios.create({
    baseURL: config.apiUrl,
    headers: {
      'apikey': apiKey,
      'Content-Type': 'application/json',
      'User-Agent': 'WhatsPulse/1.0.0 (Evolution API Client)',
    },
    httpsAgent,
    timeout: 8000,
  });
  return { client, instance: targetInstance };
}

export class EvolutionService {
  /**
   * Check connection status of WhatsApp Instance
   */
  static async getConnectionState(customName?: string) {
    try {
      const { client, instance } = await getClient(customName);
      const res = await client.get(`/instance/connectionState/${encodeURIComponent(instance)}`);
      const rawState = res.data?.instance?.state || res.data?.state || 'unknown';
      const isOpen = typeof rawState === 'string' && (rawState.toLowerCase() === 'open' || rawState.toLowerCase() === 'connected');
      const isConnecting = typeof rawState === 'string' && (rawState.toLowerCase() === 'connecting' || rawState.toLowerCase() === 'scan_qr_code');

      return {
        success: true,
        state: isOpen ? 'open' : isConnecting ? 'connecting' : rawState,
        isOpen,
        data: res.data,
      };
    } catch (error: any) {
      const errMsg = error.response?.data?.response?.message || 
                     error.response?.data?.message || 
                     (typeof error.response?.data === 'string' ? error.response.data : null) || 
                     error.message;
      console.warn('[Evolution API Connection Warning]:', errMsg);
      return {
        success: false,
        state: 'close',
        isOpen: false,
        error: Array.isArray(errMsg) ? errMsg.join(', ') : errMsg,
      };
    }
  }

  /**
   * Fetch all instances from Evolution API
   */
  static async fetchInstances() {
    try {
      const { client } = await getClient();
      const res = await client.get('/instance/fetchInstances');
      return {
        success: true,
        instances: Array.isArray(res.data) ? res.data : [],
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        instances: [],
      };
    }
  }

  /**
   * Logout / Disconnect WhatsApp instance
   */
  static async logoutInstance(customName?: string) {
    try {
      const { client, instance } = await getClient(customName);
      const res = await client.delete(`/instance/logout/${instance}`);
      return {
        success: true,
        message: 'Oturum kapatma isteği gönderildi',
        data: res.data,
      };
    } catch (error: any) {
      const errorMsg = error.response?.data?.response?.message || 
                       error.response?.data?.message || 
                       error.message;
      return {
        success: false,
        error: Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg,
      };
    }
  }

  /**
   * Send WhatsApp text message
   */
  static async sendText(rawPhone: string, text: string, delayMs = 1200) {
    const phone = normalizePhone(rawPhone);
    const { client, instance } = await getClient();

    const payload = {
      number: phone,
      text: text,
      delay: delayMs,
      linkPreview: true,
    };

    const res = await client.post(`/message/sendText/${instance}`, payload);
    return res.data;
  }

  /**
   * Send WhatsApp media (Image, PDF Document, Video, Audio)
   */
  static async sendMedia(
    rawPhone: string,
    mediaUrl: string,
    mediaType: 'image' | 'document' | 'audio' | 'video' = 'image',
    caption = '',
    fileName = 'file'
  ) {
    const phone = normalizePhone(rawPhone);
    const { client, instance } = await getClient();

    const payload: any = {
      number: phone,
      mediatype: mediaType,
      media: mediaUrl,
      caption: caption,
    };

    if (mediaType === 'document') {
      payload.fileName = fileName || 'document.pdf';
    }

    const res = await client.post(`/message/sendMedia/${instance}`, payload);
    return res.data;
  }

  /**
   * Fetch contacts list from Evolution API
   */
  static async fetchContacts() {
    try {
      const { client, instance } = await getClient();
      const res = await client.post(`/chat/findContacts/${encodeURIComponent(instance)}`, {});
      if (Array.isArray(res.data)) return res.data;
      if (Array.isArray(res.data?.contacts)) return res.data.contacts;
      if (Array.isArray(res.data?.data)) return res.data.data;
      return [];
    } catch (error) {
      try {
        const { client, instance } = await getClient();
        const res = await client.get(`/chat/findContacts/${encodeURIComponent(instance)}`);
        if (Array.isArray(res.data)) return res.data;
        if (Array.isArray(res.data?.contacts)) return res.data.contacts;
        if (Array.isArray(res.data?.data)) return res.data.data;
        return [];
      } catch (err) {
        console.warn('[Evolution API fetchContacts]: Could not fetch contacts', err);
        return [];
      }
    }
  }

  /**
   * Fetch WhatsApp Groups
   */
  static async fetchGroups() {
    try {
      const { client, instance } = await getClient();
      const res = await client.get(`/group/fetchAllGroups/${encodeURIComponent(instance)}?getParticipants=false`);
      if (Array.isArray(res.data)) return res.data;
      if (Array.isArray(res.data?.groups)) return res.data.groups;
      if (Array.isArray(res.data?.data)) return res.data.data;
      return [];
    } catch (error) {
      console.warn('[Evolution API fetchGroups]: Could not fetch groups', error);
      return [];
    }
  }

  /**
   * Fetch recent chats from WhatsApp
   */
  static async fetchChats() {
    try {
      const { client, instance } = await getClient();
      const res = await client.post(`/chat/findChats/${encodeURIComponent(instance)}`, {});
      if (Array.isArray(res.data)) return res.data;
      if (Array.isArray(res.data?.chats)) return res.data.chats;
      if (Array.isArray(res.data?.data)) return res.data.data;
      return [];
    } catch (error) {
      try {
        const { client, instance } = await getClient();
        const res = await client.get(`/chat/findChats/${encodeURIComponent(instance)}`);
        if (Array.isArray(res.data)) return res.data;
        if (Array.isArray(res.data?.chats)) return res.data.chats;
        if (Array.isArray(res.data?.data)) return res.data.data;
        return [];
      } catch (err) {
        return [];
      }
    }
  }

  /**
   * Configure Webhook in Evolution API to push message events back to WhatsPulse
   * Evolution API v2 standard
   */
  static async configureWebhook(webhookUrl: string) {
    try {
      const { client, instance } = await getClient();

      const payload = {
        webhook: {
          enabled: true,
          url: webhookUrl,
          byEvents: false,
          base64: false,
          events: [
            'MESSAGES_UPSERT',
            'MESSAGES_UPDATE',
            'SEND_MESSAGE',
            'CONNECTION_UPDATE',
          ],
        },
      };

      const res = await client.post(`/webhook/set/${instance}`, payload);
      return res.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.response?.message || 
                       error.response?.data?.message || 
                       (typeof error.response?.data === 'string' ? error.response.data : null) ||
                       error.message;
      throw new Error(Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg);
    }
  }
}
