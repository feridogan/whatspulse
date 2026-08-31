import axios, { AxiosInstance } from 'axios';
import prisma from './prisma';

interface EvolutionConfig {
  apiUrl: string;
  instanceName: string;
  instanceKey?: string;
  globalApiKey?: string;
}

const DEFAULT_API_URL = process.env.EVOLUTION_API_URL || 'http://10.0.201.201:3800';
const DEFAULT_INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME || 'ff';
const DEFAULT_INSTANCE_KEY = process.env.EVOLUTION_INSTANCE_KEY || '42A33C177D1A-4165-8F1D-0C6491AA85DD7DE66D9';
const DEFAULT_GLOBAL_API_KEY = process.env.EVOLUTION_GLOBAL_API_KEY || '16f54b4d7f24e095e8e88761f3bc993d863cafced9d6f99939824d28a206726a';

export async function getEvolutionConfig(): Promise<EvolutionConfig> {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: 'evolution_api' },
    });

    if (setting?.value && typeof setting.value === 'object') {
      const val = setting.value as any;
      let rawUrl = (val.apiUrl || DEFAULT_API_URL).trim();

      rawUrl = rawUrl
        .replace(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\.(\d{2,5})/, '$1:$2')
        .replace(/\.3800$/, ':3800')
        .replace(/\/+$/, '');

      if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
        rawUrl = 'http://' + rawUrl;
      }

      return {
        apiUrl: rawUrl,
        instanceName: (val.instanceName || DEFAULT_INSTANCE_NAME).trim(),
        instanceKey: (val.instanceKey || DEFAULT_INSTANCE_KEY).trim(),
        globalApiKey: (val.globalApiKey || DEFAULT_GLOBAL_API_KEY).trim(),
      };
    }
  } catch (err) {
    console.warn('[Evolution Config Warning]:', err);
  }

  let fallbackUrl = DEFAULT_API_URL.trim()
    .replace(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\.(\d{2,5})/, '$1:$2')
    .replace(/\.3800$/, ':3800')
    .replace(/\/+$/, '');

  if (!fallbackUrl.startsWith('http://') && !fallbackUrl.startsWith('https://')) {
    fallbackUrl = 'http://' + fallbackUrl;
  }

  return {
    apiUrl: fallbackUrl,
    instanceName: DEFAULT_INSTANCE_NAME,
    instanceKey: DEFAULT_INSTANCE_KEY,
    globalApiKey: DEFAULT_GLOBAL_API_KEY,
  };
}

export async function getClient(customInstance?: string): Promise<{ client: AxiosInstance; instance: string; config: EvolutionConfig }> {
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
      linkPreview: true,
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
  static async logout(customName?: string) {
    const { client, instance } = await getClient(customName);
    const res = await client.delete(`/instance/logout/${encodeURIComponent(instance)}`);
    return res.data;
  }
}
