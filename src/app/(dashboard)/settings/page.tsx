'use client';

import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Save, 
  Wifi, 
  QrCode, 
  RefreshCw, 
  ShieldCheck, 
  Link as LinkIcon, 
  CheckCircle, 
  AlertCircle,
  Database,
  Cpu
} from 'lucide-react';

export default function SettingsPage() {
  const [evoForm, setEvoForm] = useState({
    apiUrl: 'http://10.0.201.201:3800',
    instanceName: 'sedat2',
    instanceKey: 'CC3C74FD6208-4756-87F3-133CFA796603',
    globalApiKey: '16f54b4d7f24e095e8e88761f3bc993d863cafced9d6f99939824',
    webhookUrl: 'https://mesaj.cakirlar.net/api/webhook/evolution',
  });

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
  const [registeringWebhook, setRegisteringWebhook] = useState(false);

  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [activeQrInstance, setActiveQrInstance] = useState<string>('');
  const [modalMode, setModalMode] = useState<'loading' | 'qr' | 'connected' | 'error'>('loading');
  const [modalError, setModalError] = useState<string>('');

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
      const st = data.state || (data.success ? 'CONNECTED' : 'DISCONNECTED');
      setConnectionState(st);
      return st;
    } catch (err) {
      setConnectionState('DISCONNECTED');
      return 'DISCONNECTED';
    } finally {
      setTestingConnection(false);
    }
  };

  const handleFetchQRCode = async () => {
    const currentInstance = (evoForm.instanceName || '').trim();
    if (!currentInstance) {
      setStatusMsg({ type: 'error', text: 'Lütfen geçerli bir Instance Adı girin.' });
      return;
    }

    try {
      setLoadingQr(true);
      setQrModalOpen(true);
      setModalMode('loading');
      setQrCodeData(null);
      setPairingCode(null);
      setModalError('');
      setActiveQrInstance(currentInstance);
      setStatusMsg(null);

      // Call POST to create/connect instance with exact instanceName
      const res = await fetch('/api/evolution/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceName: currentInstance }),
      });
      const data = await res.json();

      if (data.qrcode) {
        const raw = String(data.qrcode);
        const formatted = raw.startsWith('data:') 
          ? raw 
          : raw.startsWith('http') 
          ? raw 
          : `data:image/png;base64,${raw}`;
        setQrCodeData(formatted);
        setModalMode('qr');
      } else if (data.state === 'open' || data.state === 'CONNECTED') {
        setConnectionState('open');
        setModalMode('connected');
      } else {
        setModalMode('error');
        setModalError(data.error || 'QR Kod henüz hazır değil veya alınamadı.');
      }

      if (data.pairingCode) {
        setPairingCode(data.pairingCode);
      }
    } catch (err: any) {
      setModalMode('error');
      setModalError(err.message || 'QR Kod alınamadı.');
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

    if (!window.confirm(`"${currentInstance}" WhatsApp oturumunu kapatmak ve bağlantıyı kesmek istediğinize emin misiniz?`)) {
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
        setQrCodeData(null);
        setStatusMsg({ type: 'success', text: `"${currentInstance}" WhatsApp oturumu başarıyla kapatıldı ve bağlantı kesildi.` });
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

  const handleRegisterWebhook = async () => {
    try {
      setRegisteringWebhook(true);
      setStatusMsg(null);
      const res = await fetch('/api/evolution/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: evoForm.webhookUrl,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({ type: 'success', text: 'Webhook başarıyla Evolution API sunucusuna kaydedildi!' });
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Webhook kaydedilemedi.' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setRegisteringWebhook(false);
    }
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);

    try {
      // 1. Save Evolution Settings
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'evolution_api',
          value: evoForm,
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

      setStatusMsg({ type: 'success', text: 'Tüm ayarlar başarıyla kaydedildi!' });
      checkEvolutionStatus(evoForm.instanceName);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'Hata: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // Poll connection when QR modal is open
  useEffect(() => {
    let interval: any;
    if (qrModalOpen && activeQrInstance) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/evolution/status?instance=${encodeURIComponent(activeQrInstance)}`);
          const data = await res.json();
          if (data.state === 'open' || data.state === 'CONNECTED') {
            setConnectionState('open');
            setModalMode('connected');
            clearInterval(interval);
          }
        } catch (e) {}
      }, 3500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [qrModalOpen, activeQrInstance]);

  const isConnected = connectionState === 'open' || connectionState === 'CONNECTED';
  const isConnecting = connectionState === 'connecting' || connectionState === 'SCAN_QR_CODE';

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
          <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">Evolution API & Sistem Ayarları</h1>
          <p className="text-xs text-gray-400">
            WhatsApp Evolution API entegrasyonu, Webhook ve Anti-Ban parametrelerini yapılandırın.
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all self-start sm:self-auto"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}</span>
        </button>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-2xl text-xs font-medium border animate-fade-in ${
          statusMsg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>
          {statusMsg.text}
        </div>
      )}

      {/* Evolution API Card */}
      <div className="bg-[#111b21] border border-gray-800 rounded-3xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Wifi className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Harici Evolution API Bağlantısı</h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${
              isConnected
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : isConnecting
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                : 'bg-red-500/20 text-red-400 border-red-500/30'
            }`}>
              Durum: {connectionState}
            </span>

            <button
              onClick={() => checkEvolutionStatus()}
              disabled={testingConnection}
              className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
              title="Bağlantı Durumunu Yenile"
            >
              <RefreshCw className={`w-4 h-4 ${testingConnection ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2.5 pt-1 pb-1">
          <button
            type="button"
            onClick={handleFetchQRCode}
            disabled={loadingQr}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
          >
            <QrCode className="w-4 h-4" />
            <span>{loadingQr ? 'QR Yükleniyor...' : 'Yeni Instance / QR Kod Oluştur'}</span>
          </button>

          <button
            type="button"
            onClick={handleLogoutInstance}
            disabled={loggingOut || !isConnected}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/40 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ShieldCheck className="w-4 h-4 text-rose-400" />
            <span>{loggingOut ? 'Oturum Kapatılıyor...' : 'Oturumu Kapat / Bağlantıyı Kes (Logout)'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Evolution API Sunucu URL</label>
            <input
              type="text"
              value={evoForm.apiUrl}
              onChange={(e) => setEvoForm({ ...evoForm, apiUrl: e.target.value })}
              placeholder="http://10.0.201.201:3800"
              className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">
              Instance Adı <span className="text-[10px] text-emerald-400 font-normal">(İstediğiniz gibi değiştirebilirsiniz)</span>
            </label>
            <input
              type="text"
              value={evoForm.instanceName}
              onChange={(e) => setEvoForm({ ...evoForm, instanceName: e.target.value })}
              placeholder="sedat2"
              className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Instance API Key</label>
            <input
              type="password"
              value={evoForm.instanceKey}
              onChange={(e) => setEvoForm({ ...evoForm, instanceKey: e.target.value })}
              placeholder="CC3C74FD6208-4756-87F3-133CFA796603"
              className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Global API Key</label>
            <input
              type="password"
              value={evoForm.globalApiKey}
              onChange={(e) => setEvoForm({ ...evoForm, globalApiKey: e.target.value })}
              placeholder="16f54b4d7f24e095e8e88761f3bc993d863cafced9d6f99939824"
              className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>
        </div>

        {/* Webhook Section */}
        <div className="pt-4 border-t border-gray-800/80 space-y-3">
          <label className="block text-xs font-semibold text-gray-400">Webhook Geri Bildirim URL</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="url"
              value={evoForm.webhookUrl}
              onChange={(e) => setEvoForm({ ...evoForm, webhookUrl: e.target.value })}
              placeholder="https://mesaj.cakirlar.net/api/webhook/evolution"
              className="flex-1 bg-[#202c33] border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
            />
            <button
              type="button"
              onClick={handleRegisterWebhook}
              disabled={registeringWebhook}
              className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md whitespace-nowrap"
            >
              {registeringWebhook ? 'Kaydediliyor...' : 'Webhook’u Otomatik Tanımla'}
            </button>
          </div>
          <p className="text-[11px] text-gray-500">
            Evolution API bu adrese anlık olarak gelen mesajları ve iletildi/okundu bildirimlerini gönderir.
          </p>
        </div>
      </div>

      {/* QR Code Modal Popup */}
      {qrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-[#111b21] border border-gray-700 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center">
            <div className="flex items-center justify-between pb-2 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  WhatsApp QR Bağlantısı <span className="text-xs text-emerald-400 font-mono">({activeQrInstance})</span>
                </h3>
              </div>
              <button
                onClick={() => setQrModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
              >
                ✕
              </button>
            </div>

            <div className="bg-white p-4 rounded-2xl inline-block shadow-inner mx-auto my-2 min-h-[240px] min-w-[240px] flex items-center justify-center">
              {loadingQr || modalMode === 'loading' ? (
                <div className="flex flex-col items-center gap-3 text-gray-700 py-6">
                  <RefreshCw className="w-9 h-9 animate-spin text-emerald-600" />
                  <span className="text-xs font-bold text-gray-800">QR Kod Alınıyor...</span>
                  <span className="text-[11px] text-gray-500 font-mono">{activeQrInstance}</span>
                </div>
              ) : modalMode === 'qr' && qrCodeData ? (
                <img
                  src={qrCodeData}
                  alt="WhatsApp QR Code"
                  className="w-56 h-56 object-contain"
                />
              ) : modalMode === 'connected' ? (
                <div className="flex flex-col items-center gap-3 text-emerald-700 py-6">
                  <CheckCircle className="w-14 h-14 text-emerald-500" />
                  <span className="text-sm font-bold">WhatsApp Başarıyla Bağlandı!</span>
                  <span className="text-xs text-gray-600 font-mono">Instance: {activeQrInstance}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-rose-600 p-4 text-xs font-semibold">
                  <AlertCircle className="w-8 h-8 text-rose-500" />
                  <span>{modalError || 'QR kod üretilemedi.'}</span>
                </div>
              )}
            </div>

            {pairingCode && (
              <div className="p-2.5 rounded-xl bg-gray-800/80 border border-gray-700 text-xs">
                <span className="text-gray-400 block text-[10px]">Eşleşme Kodu (Pairing Code):</span>
                <span className="font-mono font-bold text-emerald-400 text-sm tracking-wider">{pairingCode}</span>
              </div>
            )}

            <div className="text-left bg-gray-800/40 p-3 rounded-xl border border-gray-800 text-[11px] text-gray-400 space-y-1">
              <p className="font-semibold text-gray-300">Nasıl Bağlanılır?</p>
              <ol className="list-decimal list-inside space-y-0.5 text-gray-400">
                <li>Telefonunuzda WhatsApp&apos;ı açın.</li>
                <li>Menü (üç nokta) &gt; <strong className="text-white">Bağlı Cihazlar</strong> seçin.</li>
                <li><strong className="text-white">Cihaz Bağla</strong> butonuna basıp bu QR kodu taratın.</li>
              </ol>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleFetchQRCode}
                disabled={loadingQr}
                className="flex-1 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingQr ? 'animate-spin' : ''}`} />
                <span>Yenile</span>
              </button>
              <button
                type="button"
                onClick={() => setQrModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Anti-Ban & Rate Limit Card */}
      <div className="bg-[#111b21] border border-gray-800 rounded-3xl p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-800">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h2 className="text-sm font-bold text-white">Anti-Ban & Kuyruk Motoru Parametreleri</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Min Gecikme (sn)</label>
            <input
              type="number"
              min={3}
              value={antibanForm.minDelay}
              onChange={(e) => setAntibanForm({ ...antibanForm, minDelay: Number(e.target.value) })}
              className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Maks Gecikme (sn)</label>
            <input
              type="number"
              min={5}
              value={antibanForm.maxDelay}
              onChange={(e) => setAntibanForm({ ...antibanForm, maxDelay: Number(e.target.value) })}
              className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Parti Büyüklüğü (Mesaj)</label>
            <input
              type="number"
              min={5}
              value={antibanForm.batchSize}
              onChange={(e) => setAntibanForm({ ...antibanForm, batchSize: Number(e.target.value) })}
              className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Parti Molası (sn)</label>
            <input
              type="number"
              min={10}
              value={antibanForm.batchPause}
              onChange={(e) => setAntibanForm({ ...antibanForm, batchPause: Number(e.target.value) })}
              className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-1">Otomatik Kara Liste (Opt-Out) Anahtar Kelimeleri</label>
          <input
            type="text"
            value={antibanForm.optOutKeywords}
            onChange={(e) => setAntibanForm({ ...antibanForm, optOutKeywords: e.target.value })}
            placeholder="IPTAL, STOP, CIK, RED, UNSUBSCRIBE"
            className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono"
          />
          <p className="text-[11px] text-gray-500 mt-1">Virgülle ayırarak giriniz. Bu kelimeleri içeren gelen mesajlar otomatik engellenir.</p>
        </div>
      </div>

      {/* Admin Profile & Info */}
      <div className="bg-[#111b21] border border-gray-800 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-white">Yönetici Hesabı</h3>
          <p className="text-xs text-gray-400">admin@whatspulse.com (Sistem Yöneticisi)</p>
        </div>
        <div className="text-xs text-gray-500">
          WhatsPulse v1.0.0 • Production Build
        </div>
      </div>
    </div>
  );
}
