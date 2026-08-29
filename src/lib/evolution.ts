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

/**
 * Normalizes Evolution API URL, handling typos like "10.0.201.201.3800" -> "http://10.0.201.201:3800"
 */
export function normalizeEvolutionUrl(rawUrl: string): string {
  if (!rawUrl) return 'http://10.0.201.201:3800';
  let url = rawUrl.trim();

  // Fix IP.PORT typo: e.g. "10.0.201.201.3800" -> "10.0.201.201:3800"
  url = url.replace(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\.(\d{2,5})/, '$1:$2');
  url = url.replace(/\.3800$/, ':3800').replace(/\.3800\//, ':3800/');

  // Ensure protocol prefix
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'http://' + url;
  }

  // Remove trailing slashes
  return url.replace(/\/+$/, '');
}

export async function getEvolutionConfig(): Promise<EvolutionConfig> {
  let apiUrl = process.env.EVOLUTION_API_URL || 'http://10.0.201.201:3800';
  let instanceName = process.env.EVOLUTION_INSTANCE || 'ff';
  let instanceKey = process.env.EVOLUTION_API_KEY || '42A33C177D1A-4165-8F1D-0C6491AA85DD7DE66D9';
  let globalApiKey = process.env.EVOLUTION_GLOBAL_KEY || '16f54b4d7f24e095e8e88761f3bc993d863cafced9d6f99939824d28a206726a';

  try {
    const setting = await prisma.setting.findUnique({
      where: { key: 'evolution_api' },
    });
    if (setting && typeof setting.value === 'object') {
      const val = setting.value as any;
      if (val.apiUrl) apiUrl = val.apiUrl;
      if (val.evolutionUrl) apiUrl = val.evolutionUrl;
      if (val.instanceName) instanceName = val.instanceName;
      if (val.instanceKey) instanceKey = val.instanceKey;
      if (val.instanceApiKey) instanceKey = val.instanceApiKey;
      if (val.globalApiKey) globalApiKey = val.globalApiKey;
    }
  } catch (err) {
    // Database might not be ready yet during early boot
  }

  // Ensure globalApiKey is never empty, fallback to env or global default
  if (!globalApiKey || globalApiKey === 'undefined') {
    globalApiKey = process.env.EVOLUTION_GLOBAL_KEY || '16f54b4d7f24e095e8e88761f3bc993d863cafced9d6f99939824d28a206726a';
  }

  // Normalize URL
  apiUrl = normalizeEvolutionUrl(apiUrl);

  return { apiUrl, instanceName, instanceKey, globalApiKey };
}

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
});

async function getClient(customInstance?: string): Promise<{ client: AxiosInstance; instance: string }> {
  const config = await getEvolutionConfig();
  const targetInstance = customInstance?.trim() || config.instanceName || 'ff';
  // Evolution API v2: apikey header uses globalApiKey or instanceKey
  const apiKey = config.globalApiKey || config.instanceKey || '16f54b4d7f24e095e8e88761f3bc993d863cafced9d6f99939824d28a206726a';

  const client = axios.create({
    baseURL: config.apiUrl,
    headers: {
      'apikey': apiKey,
      'Content-Type': 'application/json',
      'User-Agent': 'WhatsPulse/1.0.0 (Evolution API Client)',
    },
    httpsAgent,
    timeout: 10000,
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
      const rawState = res.data?.instance?.state || res.data?.state || res.data?.status || 'unknown';
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
   * Fetch all contacts from Evolution API without limits (limit: 5000)
   */
  static async fetchContacts(customName?: string) {
    try {
      const { client, instance } = await getClient(customName);
      const res = await client.post(`/chat/findContacts/${encodeURIComponent(instance)}`, { where: {}, limit: 5000 }, { timeout: 25000 });
      let data = res.data;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        data = data.contacts || data.data || data.items || [];
      }
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      console.warn('[Evolution API fetchContacts Warn]:', err.response?.data || err.message);
      return [];
    }
  }

  /**
   * Fetch all chats from Evolution API
   */
  static async fetchChats(customName?: string) {
    try {
      const { client, instance } = await getClient(customName);
      let res;
      try {
        res = await client.post(`/chat/findChats/${encodeURIComponent(instance)}`, { where: {}, limit: 5000 }, { timeout: 25000 });
      } catch {
        res = await client.get(`/chat/findChats/${encodeURIComponent(instance)}`, { timeout: 25000 });
      }
      let data = res.data;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        data = data.chats || data.data || data.items || [];
      }
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      console.warn('[Evolution API fetchChats Warn]:', err.response?.data || err.message);
      return [];
    }
  }

  /**
   * Fetch all groups from Evolution API
   */
  static async fetchGroups(customName?: string) {
    try {
      const { client, instance } = await getClient(customName);
      const res = await client.get(`/group/fetchAllGroups/${encodeURIComponent(instance)}?getParticipants=false`, { timeout: 25000 });
      let data = res.data;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        data = data.groups || data.data || data.items || [];
      }
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      console.warn('[Evolution API fetchGroups Warn]:', err.response?.data || err.message);
      return [];
    }
  }

  /**
   * Send WhatsApp text or media message
   */
  static async sendMessage(
    recipient: string,
    content: string,
    mediaUrl?: string,
    mediaType?: string
  ) {
    const { client, instance } = await getClient();
    const cleanNumber = normalizePhone(recipient).replace(/\D/g, '');

    if (mediaUrl && mediaType && mediaType !== 'text') {
      const payload: any = {
        number: cleanNumber,
        mediatype: mediaType,
        mimetype: mediaType === 'image' ? 'image/jpeg' : mediaType === 'document' ? 'application/pdf' : 'application/octet-stream',
        caption: content || undefined,
        media: mediaUrl,
        fileName: mediaUrl.split('/').pop() || 'file',
      };

      const res = await client.post(`/message/sendMedia/${encodeURIComponent(instance)}`, payload);
      return res.data;
    }

    const payload = {
      number: cleanNumber,
      text: content,
      delay: 1200,
      linkPreview: true,
    };

    const res = await client.post(`/message/sendText/${encodeURIComponent(instance)}`, payload);
    return res.data;
  }

  /**
   * Configure Webhook in Evolution API v2 standard
   */
  static async configureWebhook(webhookUrl: string, customName?: string) {
    const { client, instance } = await getClient(customName);
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

    const res = await client.post(`/webhook/set/${encodeURIComponent(instance)}`, payload);
    return res.data;
  }

  /**
   * Logout WhatsApp instance session
   */
  static async logout(customName?: string) {
    const { client, instance } = await getClient(customName);
    const res = await client.delete(`/instance/logout/${encodeURIComponent(instance)}`);
    return res.data;
  }
}
