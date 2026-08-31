'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  Settings, 
  Save, 
  Wifi, 
  RefreshCw, 
  ShieldCheck, 
  CheckCircle, 
  AlertCircle,
  ExternalLink,
  LogOut,
  Eye,
  EyeOff,
  QrCode
} from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { isAdmin, loading: authLoading } = useAuth();

  const [evoForm, setEvoForm] = useState({
    apiUrl: 'http://10.0.201.201:3800',
    instanceName: 'ff',
    instanceKey: '42A33C177D1A-4165-8F1D-0C6491AA85DD7DE66D9',
    globalApiKey: '16f54b4d7f24e095e8e88761f3bc993d863cafced9d6f99939824d28a206726a',
  });

  const [showInstanceKey, setShowInstanceKey] = useState(false);
  const [showGlobalKey, setShowGlobalKey] = useState(false);

  const [antibanForm, setAntibanForm] = useState({
    minDelay: 8,
    maxDelay: 20,
    batchSize: 25,
    batchPause: 60,
    optOutKeywords: 'IPTAL, STOP, CIK, RED, UNSUBSCRIBE, İPTAL, ÇIK',
  });

  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [connectionState, setConnectionState] = useState<string>('Bilinmiyor');
  const [testingConnection, setTestingConnection] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // QR Code State
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);

  // Redirect non-admins to dashboard
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/');
    }
  }, [authLoading, isAdmin, router]);

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();

      let currentInst = evoForm.instanceName;
      if (data.evolution_api) {
        currentInst = data.evolution_api.instanceName || currentInst;
        setEvoForm((prev) => ({
          ...prev,
          ...data.evolution_api,
        }));
      }

      if (data.antiban_config) {
        setAntibanForm({
          minDelay: data.antiban_config.minDelay || 8,
          maxDelay: data.antiban_config.maxDelay || 20,
          batchSize: data.antiban_config.batchSize || 25,
          batchPause: data.antiban_config.batchPause || 60,
          optOutKeywords: Array.isArray(data.antiban_config.optOutKeywords)
            ? data.antiban_config.optOutKeywords.join(', ')
            : 'IPTAL, STOP, CIK',
        });
      }

      checkEvolutionStatus(currentInst);
    } catch (err) {
      console.error(err);
    }
  };

  const checkEvolutionStatus = async (inst?: string) => {
    const targetInst = (inst || evoForm.instanceName || '').trim();
    if (!targetInst) return 'DISCONNECTED';

    try {
      setTestingConnection(true);
      const res = await fetch(`/api/evolution/status?instance=${encodeURIComponent(targetInst)}`);
      const data = await res.json();
      const rawState = data.state || (data.success ? 'open' : 'close');
      const isOpen = data.isOpen || (typeof rawState === 'string' && (rawState.toLowerCase() === 'open' || rawState.toLowerCase() === 'connected'));
      const isConnecting = typeof rawState === 'string' && (rawState.toLowerCase() === 'connecting' || rawState.toLowerCase() === 'scan_qr_code');
      
      const normalizedState = isOpen ? 'open' : isConnecting ? 'connecting' : (rawState || 'close');
      setConnectionState(normalizedState);

      if (isConnecting || normalizedState === 'connecting') {
        fetchQrCode(targetInst);
      } else {
        setQrCodeData(null);
      }

      return normalizedState;
    } catch (err) {
      setConnectionState('close');
      return 'close';
    } finally {
      setTestingConnection(false);
    }
  };

  const fetchQrCode = async (inst?: string) => {
    const targetInst = (inst || evoForm.instanceName || '').trim();
    if (!targetInst) return;

    try {
      setLoadingQr(true);
      const res = await fetch(`/api/evolution/qr?instance=${encodeURIComponent(targetInst)}`);
      const data = await res.json();
      if (data.qrcode || data.base64 || data.pairingCode) {
        setQrCodeData(data.qrcode || data.base64 || data.pairingCode);
      }
    } catch (err) {
      console.error('QR alma hatası:', err);
    } finally {
      setLoadingQr(false);
    }
  };

  const handleLogoutInstance = async () => {
    const currentInstance = (evoForm.instanceName || '').trim();
    if (!currentInstance) {
      setStatusMsg({ type: 'error', text: 'Geçerli bir instance adı belirtilmedi.' });
      return;
    }

    if (!window.confirm(`"${currentInstance}" WhatsApp oturumunu kapatmak istediğinize emin misiniz?`)) {
      return;
    }

    try {
      setLoggingOut(true);
      setStatusMsg(null);
      const res = await fetch('/api/evolution/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceName: currentInstance }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setConnectionState('close');
        setStatusMsg({ type: 'success', text: `"${currentInstance}" WhatsApp oturumu başarıyla kapatıldı.` });
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Oturum kapatılamadı.' });
      }
      checkEvolutionStatus(currentInstance);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'Hata: ' + err.message });
    } finally {
      setLoggingOut(false);
    }
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);

    try {
      // Normalize API URL
      let normalizedApiUrl = evoForm.apiUrl.trim()
        .replace(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\.(\d{2,5})/, '$1:$2')
        .replace(/\.3800$/, ':3800')
        .replace(/\/+$/, '');
      if (!normalizedApiUrl.startsWith('http://') && !normalizedApiUrl.startsWith('https://')) {
        normalizedApiUrl = 'http://' + normalizedApiUrl;
      }

      const updatedEvoForm = { ...evoForm, apiUrl: normalizedApiUrl };
      setEvoForm(updatedEvoForm);

      // 1. Save Evolution Settings
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'evolution_api',
          value: updatedEvoForm,
        }),
      });

      // 2. Save Anti-Ban Settings
      const keywords = antibanForm.optOutKeywords.split(',').map((k) => k.trim().toUpperCase()).filter(Boolean);
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'antiban_config',
          value: {
            minDelay: Number(antibanForm.minDelay),
            maxDelay: Number(antibanForm.maxDelay),
            batchSize: Number(antibanForm.batchSize),
            batchPause: Number(antibanForm.batchPause),
            optOutKeywords: keywords,
          },
        }),
      });

      await checkEvolutionStatus(evoForm.instanceName);
      setStatusMsg({ type: 'success', text: 'Tüm ayarlar başarıyla kaydedildi!' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'Hata: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const isConnected = connectionState.toLowerCase() === 'open' || connectionState.toLowerCase() === 'connected';
  const isConnecting = connectionState.toLowerCase() === 'connecting' || connectionState.toLowerCase() === 'scan_qr_code';

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111b21] border border-gray-800 rounded-3xl p-5 sm:p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
              Sistem Yapılandırması
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">Evolution API & Bağlantı Ayarları</h1>
          <p className="text-xs text-gray-400">
            Evolution API v2 bağlantısı, oturum yönetimi ve Anti-Ban gönderim parametreleri.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => checkEvolutionStatus()}
            disabled={testingConnection}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#202c33] hover:bg-[#2a3942] text-gray-300 text-xs font-semibold border border-gray-700 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${testingConnection ? 'animate-spin' : ''}`} />
            <span>Bağlantıyı Kontrol Et</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-fade-in ${
          statusMsg.type === 'success'
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
            : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* WhatsApp Connection Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[#111b21] border border-gray-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl border ${
              isConnected ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
              isConnecting ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
              'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }`}>
              <Wifi className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>WhatsApp Bağlantı Durumu:</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase ${
                  isConnected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                  isConnecting ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse' :
                  'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  {isConnected ? 'BAĞLI & AKTİF' : isConnecting ? 'QR KOD BEKLENİYOR' : 'BAĞLANTI YOK'}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Aktif Instance: <span className="font-mono text-emerald-400">{evoForm.instanceName}</span> ({evoForm.apiUrl})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isConnected ? (
              <button
                type="button"
                onClick={handleLogoutInstance}
                disabled={loggingOut}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{loggingOut ? 'Kapatılıyor...' : 'Oturumu Kapat'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => fetchQrCode(evoForm.instanceName)}
                disabled={loadingQr}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>{loadingQr ? 'QR Alınıyor...' : 'QR Kodu Göster / Bağlan'}</span>
              </button>
            )}
          </div>
        </div>

        {/* QR Code Viewer (if qrCodeData is present or connecting) */}
        {qrCodeData && (
          <div className="p-5 rounded-2xl bg-[#0b141a] border border-emerald-500/40 text-center space-y-3 animate-fade-in">
            <div className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1.5">
              <QrCode className="w-4 h-4" />
              WhatsApp &gt; Bağlı Cihazlar &gt; Cihaz Bağla
            </div>
            <div className="bg-white p-3 rounded-2xl inline-block shadow-xl">
              <img
                src={qrCodeData.startsWith('data:') ? qrCodeData : `data:image/png;base64,${qrCodeData}`}
                alt="WhatsApp QR Code"
                className="w-56 h-56 mx-auto object-contain"
              />
            </div>
            <p className="text-[11px] text-gray-400">
              Telefonunuzun WhatsApp uygulamasından yukarıdaki QR kodu taratın.
            </p>
            <button
              type="button"
              onClick={() => checkEvolutionStatus(evoForm.instanceName)}
              className="px-4 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-500/30"
            >
              Bağlantıyı Kontrol Et
            </button>
          </div>
        )}
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSaveAll} className="space-y-6">
        {/* Evolution API Connection Settings */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[#111b21] border border-gray-800 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Settings className="w-4 h-4 text-emerald-400" />
            Evolution API v2 Sunucu Parametreleri
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Evolution API Sunucu URL *
              </label>
              <input
                type="text"
                required
                value={evoForm.apiUrl}
                onChange={(e) => setEvoForm({ ...evoForm, apiUrl: e.target.value })}
                placeholder="http://10.0.201.201:3800"
                className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Instance (Oturum) Adı *
              </label>
              <input
                type="text"
                required
                value={evoForm.instanceName}
                onChange={(e) => setEvoForm({ ...evoForm, instanceName: e.target.value })}
                placeholder="ff"
                className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Global API Key */}
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Global API Key
              </label>
              <input
                type={showGlobalKey ? 'text' : 'password'}
                value={evoForm.globalApiKey}
                onChange={(e) => setEvoForm({ ...evoForm, globalApiKey: e.target.value })}
                placeholder="Global API Key"
                className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3.5 py-2.5 pr-10 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowGlobalKey(!showGlobalKey)}
                className="absolute right-3 top-8 text-gray-400 hover:text-white"
              >
                {showGlobalKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Instance Key */}
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Instance Key
              </label>
              <input
                type={showInstanceKey ? 'text' : 'password'}
                value={evoForm.instanceKey}
                onChange={(e) => setEvoForm({ ...evoForm, instanceKey: e.target.value })}
                placeholder="Instance API Key"
                className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3.5 py-2.5 pr-10 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowInstanceKey(!showInstanceKey)}
                className="absolute right-3 top-8 text-gray-400 hover:text-white"
              >
                {showInstanceKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Anti-Ban & Queue Engine Settings */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[#111b21] border border-gray-800 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Toplu Mesaj Anti-Ban & Güvenlik Parametreleri
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Min. Gecikme (sn)
              </label>
              <input
                type="number"
                min="2"
                max="60"
                value={antibanForm.minDelay}
                onChange={(e) => setAntibanForm({ ...antibanForm, minDelay: Number(e.target.value) })}
                className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3.5 py-2 text-xs text-white"
              />
              <span className="text-[10px] text-gray-500">Önerilen: 5-8 sn</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Maks. Gecikme (sn)
              </label>
              <input
                type="number"
                min="5"
                max="120"
                value={antibanForm.maxDelay}
                onChange={(e) => setAntibanForm({ ...antibanForm, maxDelay: Number(e.target.value) })}
                className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3.5 py-2 text-xs text-white"
              />
              <span className="text-[10px] text-gray-500">Önerilen: 15-20 sn</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Parti (Batch) Boyutu
              </label>
              <input
                type="number"
                min="5"
                max="500"
                value={antibanForm.batchSize}
                onChange={(e) => setAntibanForm({ ...antibanForm, batchSize: Number(e.target.value) })}
                className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3.5 py-2 text-xs text-white"
              />
              <span className="text-[10px] text-gray-500">Kaç mesajda bir mola verilsin</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Parti Molası (sn)
              </label>
              <input
                type="number"
                min="10"
                max="600"
                value={antibanForm.batchPause}
                onChange={(e) => setAntibanForm({ ...antibanForm, batchPause: Number(e.target.value) })}
                className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3.5 py-2 text-xs text-white"
              />
              <span className="text-[10px] text-gray-500">Önerilen: 60 sn</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Otomatik Opt-Out / Kara Liste Anahtar Kelimeleri
            </label>
            <input
              type="text"
              value={antibanForm.optOutKeywords}
              onChange={(e) => setAntibanForm({ ...antibanForm, optOutKeywords: e.target.value })}
              placeholder="IPTAL, STOP, CIK, RED, UNSUBSCRIBE"
              className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white"
            />
            <span className="text-[10px] text-gray-500">
              Gelen mesaj bu kelimelerden birini içerirse numara otomatik kara listeye alınır.
            </span>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Kaydediliyor...' : 'Tüm Ayarları Kaydet'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
