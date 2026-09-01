"use client";

import React, { useState, useEffect } from "react";
import { 
  Settings, 
  Power, 
  UserCheck, 
  Mic, 
  Cpu, 
  Wifi, 
  WifiOff, 
  QrCode, 
  LogOut, 
  Clock, 
  ShieldCheck, 
  Database, 
  Server, 
  HardDrive, 
  Download, 
  Upload, 
  Save, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  Layers,
  FileText
} from "lucide-react";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 1. System General & Interaction
  const [systemActive, setSystemActive] = useState(true);
  const [interactiveModeOnly, setInteractiveModeOnly] = useState(false);

  // 2. TTS Voice & AI Settings
  const [ttsEngine, setTtsEngine] = useState("edge_ai"); // edge_ai, google_tts, azure_speech
  const [voiceCharacter, setVoiceCharacter] = useState("tr-TR-AhmetNeural");
  const [azureKey, setAzureKey] = useState("");
  const [azureRegion, setAzureRegion] = useState("westeurope");

  // 3. Evolution API & Webhook
  const [evoUrl, setEvoUrl] = useState("http://10.0.201.201:3800");
  const [evoApiKey, setEvoApiKey] = useState("16f54b4d7f24e095e8e88761f3bc993d863cafced9d6f99939824d28a206726a");
  const [evoInstance, setEvoInstance] = useState("ff");
  const [webhookActive, setWebhookActive] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState("https://mesaj.cakirlar.net/api/webhook");

  // WhatsApp Connection State
  const [connectionState, setConnectionState] = useState<string>("close");
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // 4. Schedulers & Quiet Hours & Delays
  const [quietHoursStart, setQuietHoursStart] = useState("21:00");
  const [quietHoursEnd, setQuietHoursEnd] = useState("08:30");
  const [minDelay, setMinDelay] = useState(5);
  const [maxDelay, setMaxDelay] = useState(15);
  const [morningTrigger, setMorningTrigger] = useState("09:00");
  const [noonTrigger, setNoonTrigger] = useState("14:00");
  const [eveningTrigger, setEveningTrigger] = useState("18:00");

  // 5. System Health
  const [health, setHealth] = useState({
    db: "connected",
    redis: "active",
    nodeEnv: "production",
    port: "3000"
  });

  const loadSettings = async () => {
    try {
      setLoading(true);
      const [setRes, evoRes] = await Promise.all([
        fetch("/api/settings"),
        fetch("/api/evolution/status")
      ]);
      const setData = await setRes.json();
      const evoData = await evoRes.json();

      if (setData.settings) {
        const s = setData.settings;
        if (s.system_active !== undefined) setSystemActive(s.system_active === "true" || s.system_active === true);
        if (s.interactive_mode !== undefined) setInteractiveModeOnly(s.interactive_mode === "true" || s.interactive_mode === true);
        if (s.tts_engine) setTtsEngine(s.tts_engine);
        if (s.voice_character) setVoiceCharacter(s.voice_character);
        if (s.azure_key) setAzureKey(s.azure_key);
        if (s.azure_region) setAzureRegion(s.azure_region);
        if (s.evolution_api_url) setEvoUrl(s.evolution_api_url);
        if (s.evolution_global_key) setEvoApiKey(s.evolution_global_key);
        if (s.evolution_instance) setEvoInstance(s.evolution_instance);
        if (s.webhook_url) setWebhookUrl(s.webhook_url);
        if (s.quiet_hours_start) setQuietHoursStart(s.quiet_hours_start);
        if (s.quiet_hours_end) setQuietHoursEnd(s.quiet_hours_end);
        if (s.min_delay) setMinDelay(Number(s.min_delay));
        if (s.max_delay) setMaxDelay(Number(s.max_delay));
      }

      if (evoData.state) {
        setConnectionState(evoData.isOpen ? "open" : evoData.state);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);

    const payload = {
      system_active: String(systemActive),
      interactive_mode: String(interactiveModeOnly),
      tts_engine: ttsEngine,
      voice_character: voiceCharacter,
      azure_key: azureKey,
      azure_region: azureRegion,
      evolution_api_url: evoUrl.trim(),
      evolution_global_key: evoApiKey.trim(),
      evolution_instance: evoInstance.trim(),
      webhook_url: webhookUrl.trim(),
      quiet_hours_start: quietHoursStart,
      quiet_hours_end: quietHoursEnd,
      min_delay: String(minDelay),
      max_delay: String(maxDelay),
    };

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg({ type: "success", text: "Tüm sistem ve DTS ayarları başarıyla kaydedildi." });
      } else {
        setStatusMsg({ type: "error", text: data.error || "Ayarlar kaydedilemedi." });
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: "Hata: " + err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleFetchQr = async () => {
    setLoadingQr(true);
    try {
      const res = await fetch(`/api/evolution/qr?instance=${encodeURIComponent(evoInstance)}&refresh=true`);
      const data = await res.json();
      if (data.qrcode || data.base64) {
        setQrCodeData(data.qrcode || data.base64);
      } else {
        alert("QR kod oluşturulamadı veya oturum zaten bağlı.");
      }
    } catch (err: any) {
      alert("QR alma hatası: " + err.message);
    } finally {
      setLoadingQr(false);
    }
  };

  const handleLogoutInstance = async () => {
    if (!confirm(`"${evoInstance}" WhatsApp oturumunu kapatmak istediğinize emin misiniz?`)) return;
    setLoggingOut(true);
    try {
      const res = await fetch("/api/evolution/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceName: evoInstance })
      });
      const data = await res.json();
      if (data.success) {
        setConnectionState("close");
        setQrCodeData(null);
        alert("Oturum kapatıldı.");
      } else {
        alert(data.error || "Oturum kapatılamadı.");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoggingOut(false);
    }
  };

  const isConnected = connectionState === "open" || connectionState === "CONNECTED";

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-[#111b21] border border-gray-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-xs font-bold border border-amber-500/30">
              Sistem Parametreleri
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-1">DTS & Entegrasyon Ayarları</h1>
          <p className="text-xs text-gray-400">
            Evolution API, Webhook, Sesli Mesaj (TTS), Otomatik Zamanlayıcılar ve Veritabanı Yönetimi.
          </p>
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Save className="w-4 h-4 text-black" />
          <span>{saving ? "Kaydediliyor..." : "Tüm Ayarları Kaydet"}</span>
        </button>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-bold shadow-md ${
          statusMsg.type === "success"
            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
            : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
        }`}>
          {statusMsg.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* CARD 1: Sistem Genel Durumu & Etkileşim */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[#111b21] border border-gray-800 shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-800">
            <Power className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-bold text-white">1. Sistem Genel Durumu & Etkileşimli Mod</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* System Status Toggle */}
            <div className="p-4 rounded-2xl bg-[#16222b] border border-gray-700 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white">Sistem Genel Durumu</div>
                <div className="text-[11px] text-gray-400">Tüm otomatik domain bildirimleri ve servisleri etkinleştir.</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={systemActive}
                  onChange={(e) => setSystemActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            {/* Interactive Mode Toggle */}
            <div className="p-4 rounded-2xl bg-[#16222b] border border-gray-700 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white">Etkileşimli Gönderim Modu</div>
                <div className="text-[11px] text-gray-400">Yalnızca WhatsApp onaylı veya yanıt veren kişilere bildirim yap.</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={interactiveModeOnly}
                  onChange={(e) => setInteractiveModeOnly(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
          </div>
        </div>

        {/* CARD 2: Sesli Mesaj & Yapay Zeka Ayarları (TTS) */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[#111b21] border border-gray-800 shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-800">
            <Mic className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">2. Sesli Mesaj & Yapay Zeka Ayarları (TTS)</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Seslendirme Motoru</label>
              <select
                value={ttsEngine}
                onChange={(e) => setTtsEngine(e.target.value)}
                className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="edge_ai">Edge AI Neural Voice (Ücretsiz & Doğal Türkçe)</option>
                <option value="google_tts">Google Cloud Text-to-Speech</option>
                <option value="azure_speech">Microsoft Azure AI Speech</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Ses Karakteri / Tonu</label>
              <select
                value={voiceCharacter}
                onChange={(e) => setVoiceCharacter(e.target.value)}
                className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="tr-TR-AhmetNeural">Ahmet (Vakur Erkek Sesi - Önerilen)</option>
                <option value="tr-TR-EmelNeural">Emel (Akıcı Kadın Sesi)</option>
                <option value="tr-TR-SelmaNeural">Selma (Kurumsal Kadın Sesi)</option>
              </select>
            </div>
          </div>

          {ttsEngine === "azure_speech" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Azure Speech Key</label>
                <input
                  type="password"
                  placeholder="Azure Cognitive Speech Key..."
                  value={azureKey}
                  onChange={(e) => setAzureKey(e.target.value)}
                  className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Azure Region</label>
                <input
                  type="text"
                  placeholder="westeurope"
                  value={azureRegion}
                  onChange={(e) => setAzureRegion(e.target.value)}
                  className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>
          )}
        </div>

        {/* CARD 3: Evolution API (WhatsApp) Bağlantısı & Webhook */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[#111b21] border border-gray-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <Wifi className="w-5 h-5 text-amber-400" />
              <h2 className="text-sm font-bold text-white">3. Evolution API (WhatsApp) Bağlantısı & Webhook</h2>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase font-mono border ${
                isConnected 
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                  : "bg-rose-500/20 text-rose-400 border-rose-500/30"
              }`}>
                {isConnected ? "BAĞLI (AÇIK)" : "KOPUK"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Evolution API Sunucu URL *</label>
              <input
                type="text"
                required
                value={evoUrl}
                onChange={(e) => setEvoUrl(e.target.value)}
                placeholder="http://10.0.201.201:3800"
                className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">API Key (Global Key) *</label>
              <input
                type="password"
                required
                value={evoApiKey}
                onChange={(e) => setEvoApiKey(e.target.value)}
                className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Instance (Oturum) Adı *</label>
              <input
                type="text"
                required
                value={evoInstance}
                onChange={(e) => setEvoInstance(e.target.value)}
                placeholder="ff"
                className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          {/* Webhook Settings */}
          <div className="p-4 rounded-2xl bg-[#16222b] border border-gray-700 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white">Webhook Durumu</div>
                <div className="text-[11px] text-gray-400">Gelen WhatsApp mesajlarını ve iletim raporlarını anında yakala.</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={webhookActive}
                  onChange={(e) => setWebhookActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://mesaj.cakirlar.net/api/webhook"
                className="flex-1 bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
              <button
                type="button"
                onClick={() => setWebhookUrl("https://mesaj.cakirlar.net/api/webhook")}
                className="px-3 py-2 rounded-xl bg-[#202c33] hover:bg-[#2a3942] text-amber-300 border border-amber-500/30 text-xs font-bold shrink-0 cursor-pointer"
              >
                Otomatik Algıla
              </button>
            </div>
          </div>

          {/* WhatsApp QR & Connection Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <button
                  type="button"
                  onClick={handleLogoutInstance}
                  disabled={loggingOut}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{loggingOut ? "Kapatılıyor..." : "Oturumu Kapat (Çıkış Yap)"}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFetchQr}
                  disabled={loadingQr}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-600/20 cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  <span>{loadingQr ? "QR Üretiliyor..." : "QR Kodu Göster / Bağlan"}</span>
                </button>
              )}
            </div>

            {qrCodeData && (
              <div className="p-4 rounded-2xl bg-[#0b141a] border border-amber-500/40 text-center space-y-2 w-full mt-3">
                <div className="text-xs font-bold text-amber-400">WhatsApp &gt; Bağlı Cihazlar &gt; Cihaz Bağla</div>
                <div className="bg-white p-3 rounded-2xl inline-block shadow-2xl">
                  <img
                    src={qrCodeData.startsWith("data:") ? qrCodeData : `data:image/png;base64,${qrCodeData}`}
                    alt="WhatsApp QR Code"
                    className="w-52 h-52 mx-auto object-contain"
                  />
                </div>
                <p className="text-[11px] text-gray-400">Telefonunuzun WhatsApp uygulamasından QR kodu taratın.</p>
              </div>
            )}
          </div>
        </div>

        {/* CARD 4: Otomatik Zamanlayıcılar & Sessiz Saatler */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[#111b21] border border-gray-800 shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-800">
            <Clock className="w-5 h-5 text-teal-400" />
            <h2 className="text-sm font-bold text-white">4. Otomatik Zamanlayıcılar & Sessiz Saatler</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Sabah Bildirim Saati</label>
              <input
                type="time"
                value={morningTrigger}
                onChange={(e) => setMorningTrigger(e.target.value)}
                className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Öğle Bildirim Saati</label>
              <input
                type="time"
                value={noonTrigger}
                onChange={(e) => setNoonTrigger(e.target.value)}
                className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Akşam Bildirim Saati</label>
              <input
                type="time"
                value={eveningTrigger}
                onChange={(e) => setEveningTrigger(e.target.value)}
                className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Quiet Hours */}
            <div className="p-4 rounded-2xl bg-[#16222b] border border-gray-700 space-y-2">
              <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Sessiz Saatler (Rahatsız Etmeyin)</span>
              </div>
              <p className="text-[11px] text-gray-400">Bu saatler arasında bildirimler kuyrukta bekletilir.</p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="text-[10px] text-gray-400 block">Başlangıç</label>
                  <input
                    type="time"
                    value={quietHoursStart}
                    onChange={(e) => setQuietHoursStart(e.target.value)}
                    className="w-full bg-[#202c33] border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block">Bitiş</label>
                  <input
                    type="time"
                    value={quietHoursEnd}
                    onChange={(e) => setQuietHoursEnd(e.target.value)}
                    className="w-full bg-[#202c33] border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Anti-Spam Random Delays */}
            <div className="p-4 rounded-2xl bg-[#16222b] border border-gray-700 space-y-2">
              <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Anti-Spam Rastgele Gecikme</span>
              </div>
              <p className="text-[11px] text-gray-400">Mesajlar arasında insan simülasyonu rastgele bekleme süresi.</p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="text-[10px] text-gray-400 block">Min. Gecikme (sn)</label>
                  <input
                    type="number"
                    min={2}
                    value={minDelay}
                    onChange={(e) => setMinDelay(Number(e.target.value))}
                    className="w-full bg-[#202c33] border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block">Max. Gecikme (sn)</label>
                  <input
                    type="number"
                    min={minDelay}
                    value={maxDelay}
                    onChange={(e) => setMaxDelay(Number(e.target.value))}
                    className="w-full bg-[#202c33] border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 5: Sistem Sağlığı & Canlı Durum */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[#111b21] border border-gray-800 shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-800">
            <Server className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">5. Sistem Sağlığı & Canlı Durum Kartları</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#16222b] border border-gray-700 space-y-1">
              <div className="text-[11px] text-gray-400">PostgreSQL Veritabanı</div>
              <div className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Bağlı & Aktif
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#16222b] border border-gray-700 space-y-1">
              <div className="text-[11px] text-gray-400">Redis Bellek & Kuyruk</div>
              <div className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> BullMQ Çalışıyor
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#16222b] border border-gray-700 space-y-1">
              <div className="text-[11px] text-gray-400">Evolution API v2</div>
              <div className="text-xs font-bold text-amber-300 flex items-center gap-1 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5" /> {isConnected ? "Oturum: open" : "Oturum: close"}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#16222b] border border-gray-700 space-y-1 font-mono">
              <div className="text-[11px] text-gray-400">Node Env / Port</div>
              <div className="text-xs font-bold text-white">production:3000</div>
            </div>
          </div>
        </div>

        {/* CARD 6: Veri Yedekleme & Geri Yükleme */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[#111b21] border border-gray-800 shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-800">
            <HardDrive className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-bold text-white">6. Veri Yedekleme & Geri Yükleme (Disaster Recovery)</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-[#16222b] border border-gray-700 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white">Veritabanı Yedeği İndir</div>
                <div className="text-[11px] text-gray-400">Tüm aboneleri, domainleri ve ayarları JSON olarak kaydet.</div>
              </div>
              <a
                href="/api/admin/backup"
                download
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black shadow-md cursor-pointer shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-black" />
                <span>Yedek İndir (.json)</span>
              </a>
            </div>

            <div className="p-4 rounded-2xl bg-[#16222b] border border-gray-700 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white">Yedek Dosyası Geri Yükle</div>
                <div className="text-[11px] text-gray-400">Önceki bir JSON yedeğini sisteme aktar.</div>
              </div>
              <label className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#202c33] hover:bg-[#2a3942] text-amber-300 border border-amber-500/30 text-xs font-bold shadow-md cursor-pointer shrink-0">
                <Upload className="w-3.5 h-3.5" />
                <span>Yedek Yükle</span>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const text = await file.text();
                      const json = JSON.parse(text);
                      const res = await fetch("/api/admin/backup", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(json)
                      });
                      const data = await res.json();
                      if (data.success) {
                        alert(data.message);
                        loadSettings();
                      } else {
                        alert(data.error || "Geri yükleme başarısız.");
                      }
                    } catch (err: any) {
                      alert("Dosya okunamadı: " + err.message);
                    }
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
