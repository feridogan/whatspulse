import axios from 'axios';
import prisma from './prisma';

interface EvolutionConfig {
  apiUrl: string;
  instanceKey?: string;
  globalApiKey?: string;
  instanceName: string;
}

let cachedConfig: EvolutionConfig | null = null;
let lastConfigFetch = 0;
const CACHE_TTL = 30000; // 30 seconds cache

/**
 * Fetch and cache Evolution API configuration from database or env variables
 */
export async function getEvolutionConfig(): Promise<EvolutionConfig> {
  const now = Date.now();
  if (cachedConfig && now - lastConfigFetch < CACHE_TTL) {
    return cachedConfig;
  }

  let apiUrl = process.env.EVOLUTION_API_URL || 'http://10.0.201.201:3800';
  let instanceName = process.env.EVOLUTION_INSTANCE || 'ff';
  let globalApiKey = process.env.EVOLUTION_GLOBAL_KEY || process.env.EVOLUTION_API_KEY || '16f54b4d7f24e095e8e88761f3bc993d863cafced9d6f99939824d28a206726a';
  let instanceKey = process.env.EVOLUTION_API_KEY || '';

  try {
    const settings = await prisma.setting.findMany({
      where: {
        key: { in: ['evolution_api_url', 'evolution_instance', 'evolution_global_key', 'evolution_api_key'] },
      },
    });

    for (const s of settings) {
      const val = typeof s.value === 'string' ? s.value : JSON.stringify(s.value).replace(/^"|"$/g, '');
      if (s.key === 'evolution_api_url' && val) apiUrl = val;
      if (s.key === 'evolution_instance' && val) instanceName = val;
      if (s.key === 'evolution_global_key' && val) globalApiKey = val;
      if (s.key === 'evolution_api_key' && val) instanceKey = val;
    }
  } catch (error) {
    console.warn('[Evolution Config]: Using environment variables as fallback.');
  }

  apiUrl = apiUrl.replace(/\/+$/, '');

  cachedConfig = { apiUrl, instanceKey, globalApiKey, instanceName };
  lastConfigFetch = now;
  return cachedConfig;
}

async function getClient(customInstance?: string) {
  const config = await getEvolutionConfig();
  const instance = customInstance || config.instanceName;

  const keyToUse = config.globalApiKey || config.instanceKey || '';

  const client = axios.create({
    baseURL: config.apiUrl,
    headers: {
      'Content-Type': 'application/json',
      apikey: keyToUse,
    },
    timeout: 30000,
  });

  return { client, instance, config };
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
   * Fetch QR code or connect/create WhatsApp instance
   */
  static async createInstance(customName?: string) {
    const { client, instance } = await getClient(customName);
    try {
      // 1. Try to connect to existing instance to get QR
      const connectRes = await client.get(`/instance/connect/${encodeURIComponent(instance)}`);
      const qrData = connectRes.data?.qrcode || connectRes.data?.base64 || connectRes.data?.code || connectRes.data?.pairingCode;
      if (qrData) {
        return {
          success: true,
          qrcode: qrData,
          base64: qrData,
          pairingCode: connectRes.data?.pairingCode,
          data: connectRes.data,
        };
      }
      return {
        success: true,
        data: connectRes.data,
      };
    } catch (connectError: any) {
      // 2. If instance doesn't exist, create it
      try {
        const createRes = await client.post('/instance/create', {
          instanceName: instance,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
        });
        const qrData = createRes.data?.qrcode?.base64 || createRes.data?.base64 || createRes.data?.qrcode || createRes.data?.code;
        return {
          success: true,
          qrcode: qrData,
          base64: qrData,
          data: createRes.data,
        };
      } catch (createError: any) {
        const errMsg = createError.response?.data?.response?.message || createError.response?.data?.message || createError.message;
        return {
          success: false,
          error: Array.isArray(errMsg) ? errMsg.join(', ') : errMsg,
        };
      }
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
    const cleanNumber = recipient.includes('@g.us')
      ? recipient
      : recipient.split('@')[0].replace(/:.*$/, '').replace(/\D/g, '');

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
      linkPreview: false,
    };

    const res = await client.post(`/message/sendText/${encodeURIComponent(instance)}`, payload);
    return res.data;
  }

  static async sendText(recipient: string, text: string) {
    return this.sendMessage(recipient, text);
  }

  static async sendMedia(recipient: string, mediaUrl: string, mediaType: 'image' | 'video' | 'document' | 'audio' = 'image', caption?: string) {
    return this.sendMessage(recipient, caption || '', mediaUrl, mediaType);
  }

  /**
   * Logout WhatsApp instance session
   */
  static async logoutInstance(customName?: string) {
    try {
      const { client, instance } = await getClient(customName);
      const res = await client.delete(`/instance/logout/${encodeURIComponent(instance)}`);
      return { success: true, data: res.data, message: `"${instance}" oturumu kapatıldı.` };
    } catch (error: any) {
      // Also try instance delete or disconnect
      try {
        const { client, instance } = await getClient(customName);
        const delRes = await client.delete(`/instance/delete/${encodeURIComponent(instance)}`);
        return { success: true, data: delRes.data, message: `"${instance}" oturumu silindi/kapatıldı.` };
      } catch (e: any) {
        const errMsg = error.response?.data?.response?.message || error.response?.data?.message || error.message;
        return { success: false, error: Array.isArray(errMsg) ? errMsg.join(', ') : errMsg };
      }
    }
  }

  static async logout(customName?: string) {
    return this.logoutInstance(customName);
  }
}
