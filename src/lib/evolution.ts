import axios, { AxiosInstance } from 'axios';
import prisma from './prisma';
import { normalizePhone } from './utils';

export interface EvolutionConfig {
  apiUrl: string;
  instanceName: string;
  instanceKey: string;
  globalApiKey: string;
}

export async function getEvolutionConfig(): Promise<EvolutionConfig> {
  let apiUrl = process.env.EVOLUTION_API_URL || 'http://10.0.201.201:3800';
  let instanceName = process.env.EVOLUTION_INSTANCE || 'sedat2';
  let instanceKey = process.env.EVOLUTION_API_KEY || 'CC3C74FD6208-4756-87F3-133CFA796603';
  let globalApiKey = process.env.EVOLUTION_GLOBAL_KEY || '16f54b4d7f24e095e8e88761f3bc993d863cafced9d6f99939824';

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

  // Clean trailing slash
  apiUrl = apiUrl.replace(/\/$/, '');

  return { apiUrl, instanceName, instanceKey, globalApiKey };
}

async function getClient(): Promise<{ client: AxiosInstance; instance: string }> {
  const config = await getEvolutionConfig();
  const client = axios.create({
    baseURL: config.apiUrl,
    headers: {
      'apikey': config.instanceKey || config.globalApiKey,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });
  return { client, instance: config.instanceName };
}

export class EvolutionService {
  /**
   * Check connection status of WhatsApp Instance
   */
  static async getConnectionState() {
    try {
      const { client, instance } = await getClient();
      const res = await client.get(`/instance/connectionState/${instance}`);
      return {
        success: true,
        state: res.data?.instance?.state || res.data?.state || 'unknown',
        data: res.data,
      };
    } catch (error: any) {
      return {
        success: false,
        state: 'DISCONNECTED',
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Create a new WhatsApp Instance or connect to existing one
   */
  static async createInstance(customName?: string) {
    try {
      const config = await getEvolutionConfig();
      const instanceName = customName || config.instanceName;
      const client = axios.create({
        baseURL: config.apiUrl,
        headers: {
          'apikey': config.globalApiKey || config.instanceKey,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      // Try creating instance
      const payload = {
        instanceName: instanceName,
        token: config.instanceKey || '',
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      };

      try {
        const res = await client.post('/instance/create', payload);
        return {
          success: true,
          created: true,
          instance: res.data?.instance?.instanceName || instanceName,
          qrcode: res.data?.qrcode?.base64 || res.data?.base64 || res.data?.qrcode || null,
          pairingCode: res.data?.pairingCode || null,
          state: res.data?.instance?.state || 'SCAN_QR_CODE',
          data: res.data,
        };
      } catch (createErr: any) {
        // If instance already exists or conflict, try connecting
        const connectRes = await client.get(`/instance/connect/${instanceName}`);
        return {
          success: true,
          created: false,
          instance: instanceName,
          qrcode: connectRes.data?.base64 || connectRes.data?.qrcode?.base64 || connectRes.data?.qrcode || connectRes.data?.code || null,
          pairingCode: connectRes.data?.pairingCode || null,
          state: connectRes.data?.instance?.state || 'SCAN_QR_CODE',
          data: connectRes.data,
        };
      }
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
   * Fetch QR code for WhatsApp Web connection
   */
  static async getQRCode(customName?: string) {
    try {
      const { client, instance } = await getClient();
      const targetInstance = customName || instance;
      const res = await client.get(`/instance/connect/${targetInstance}`);
      return {
        success: true,
        qrcode: res.data?.base64 || res.data?.qrcode?.base64 || res.data?.qrcode || res.data?.code || null,
        pairingCode: res.data?.pairingCode || null,
        state: res.data?.instance?.state || 'SCAN_QR_CODE',
        data: res.data,
      };
    } catch (error: any) {
      // If 404 or not found, try creating instance
      if (error.response?.status === 404) {
        return this.createInstance(customName);
      }
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Logout / Disconnect WhatsApp instance
   */
  static async logoutInstance(customName?: string) {
    try {
      const { client, instance } = await getClient();
      const targetInstance = customName || instance;
      const res = await client.delete(`/instance/logout/${targetInstance}`);
      return {
        success: true,
        message: 'Oturum başarıyla kapatıldı',
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
      const res = await client.post(`/chat/findContacts/${instance}`, {});
      return Array.isArray(res.data) ? res.data : [];
    } catch (error) {
      console.warn('Could not fetch contacts via POST, trying GET...', error);
      try {
        const { client, instance } = await getClient();
        const res = await client.get(`/chat/findContacts/${instance}`);
        return Array.isArray(res.data) ? res.data : [];
      } catch (err) {
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
      const res = await client.get(`/group/fetchAllGroups/${instance}?getParticipants=false`);
      return Array.isArray(res.data) ? res.data : [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Fetch recent chats from WhatsApp
   */
  static async fetchChats() {
    try {
      const { client, instance } = await getClient();
      const res = await client.post(`/chat/findChats/${instance}`, {});
      return Array.isArray(res.data) ? res.data : [];
    } catch (error) {
      return [];
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
