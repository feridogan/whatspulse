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
  let globalApiKey = process.env.EVOLUTION_GLOBAL_KEY || process.env.EVOLUTION_API_KEY || '16f54b4d7f24e095e8e88761f3bc993d863cafced9d6f99939824';

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
    globalApiKey = process.env.EVOLUTION_GLOBAL_KEY || process.env.EVOLUTION_API_KEY || '16f54b4d7f24e095e8e88761f3bc993d863cafced9d6f99939824';
  }

  // Clean trailing slash
  apiUrl = apiUrl.replace(/\/$/, '');

  return { apiUrl, instanceName, instanceKey, globalApiKey };
}

async function getClient(customInstance?: string): Promise<{ client: AxiosInstance; instance: string }> {
  const config = await getEvolutionConfig();
  const targetInstance = customInstance?.trim() || config.instanceName;
  // Evolution API v2: apikey header must be globalApiKey (with fallback to instanceKey)
  const apiKey = config.globalApiKey || config.instanceKey || '16f54b4d7f24e095e8e88761f3bc993d863cafced9d6f99939824';

  const client = axios.create({
    baseURL: config.apiUrl,
    headers: {
      'apikey': apiKey,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });
  return { client, instance: targetInstance };
}

function extractQRCode(data: any): string | null {
  if (!data) return null;
  if (typeof data === 'string') {
    if (data.startsWith('data:image') || data.startsWith('iVBORw0KGgo') || data.length > 80) {
      return data;
    }
  }
  if (data.qrcode) {
    if (typeof data.qrcode === 'string') return data.qrcode;
    if (typeof data.qrcode === 'object') {
      if (typeof data.qrcode.base64 === 'string') return data.qrcode.base64;
      if (typeof data.qrcode.code === 'string') return data.qrcode.code;
    }
  }
  if (typeof data.base64 === 'string') return data.base64;
  if (typeof data.code === 'string' && data.code.length > 50) return data.code;
  return null;
}

export class EvolutionService {
  /**
   * Check connection status of WhatsApp Instance
   */
  static async getConnectionState(customName?: string) {
    try {
      const { client, instance } = await getClient(customName);
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
        error: error.response?.data?.message || error.message,
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
   * Create a new WhatsApp Instance or connect to existing one
   */
  static async createInstance(customName?: string) {
    try {
      const { client, instance } = await getClient(customName);

      let qrCodeString: string | null = null;
      let pairingCodeString: string | null = null;
      let instanceState = 'SCAN_QR_CODE';
      let responseData: any = null;

      // 1. First, attempt to create the instance
      try {
        const payload: any = {
          instanceName: instance,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
        };

        const res = await client.post('/instance/create', payload);
        responseData = res.data;
        qrCodeString = extractQRCode(res.data);
        pairingCodeString = res.data?.pairingCode || res.data?.qrcode?.pairingCode || null;
        instanceState = res.data?.instance?.state || res.data?.state || 'SCAN_QR_CODE';
      } catch (createErr: any) {
        const createErrData = createErr.response?.data;
        const createErrMsg = JSON.stringify(createErrData || createErr.message || '').toLowerCase();
        
        // If instance already exists, fetch connect QR directly
        if (
          createErr.response?.status === 400 || 
          createErr.response?.status === 403 || 
          createErr.response?.status === 409 ||
          createErrMsg.includes('already') ||
          createErrMsg.includes('exists') ||
          createErrMsg.includes('in use')
        ) {
          try {
            const connectRes = await client.get(`/instance/connect/${encodeURIComponent(instance)}`);
            responseData = connectRes.data;
            qrCodeString = extractQRCode(connectRes.data);
            pairingCodeString = connectRes.data?.pairingCode || connectRes.data?.qrcode?.pairingCode || null;
            instanceState = connectRes.data?.instance?.state || connectRes.data?.state || 'SCAN_QR_CODE';
          } catch (connectErr: any) {
            // If connect failed, re-throw with clear message
            throw new Error(connectErr.response?.data?.message || connectErr.message || 'Instance bağlanamadı');
          }
        } else {
          const errMsg = createErr.response?.data?.response?.message || 
                         createErr.response?.data?.message || 
                         createErr.message;
          throw new Error(Array.isArray(errMsg) ? errMsg.join(', ') : errMsg);
        }
      }

      // 2. If instance was created or connected but QR was not immediately in the body, try connect once
      if (!qrCodeString && instanceState !== 'open') {
        try {
          const connectRes = await client.get(`/instance/connect/${encodeURIComponent(instance)}`);
          qrCodeString = extractQRCode(connectRes.data);
          pairingCodeString = connectRes.data?.pairingCode || pairingCodeString;
          instanceState = connectRes.data?.instance?.state || connectRes.data?.state || instanceState;
        } catch (e) {}
      }

      return {
        success: true,
        instance: instance,
        qrcode: qrCodeString,
        pairingCode: pairingCodeString,
        state: instanceState,
        data: responseData,
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
   * Fetch QR code for WhatsApp Web connection (creates if missing)
   */
  static async getQRCode(customName?: string) {
    return this.createInstance(customName);
  }

  /**
   * Logout / Disconnect WhatsApp instance
   */
  static async logoutInstance(customName?: string) {
    try {
      const { client, instance } = await getClient(customName);

      // Try logout first
      try {
        const res = await client.delete(`/instance/logout/${instance}`);
        return {
          success: true,
          message: 'Oturum başarıyla kapatıldı',
          data: res.data,
        };
      } catch (logoutErr: any) {
        // If logout fails, try deleting instance
        const delRes = await client.delete(`/instance/delete/${instance}`);
        return {
          success: true,
          message: 'Instance sıfırlandı ve bağlantı kesildi',
          data: delRes.data,
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
