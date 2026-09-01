"use client";

import React, { useState, useEffect } from "react";
import { 
  Settings, 
  Power, 
  UserCheck, 
  Mic, 
  Wifi, 
  WifiOff, 
  QrCode, 
  LogOut, 
  Clock, 
  ShieldCheck, 
  Database, 
  Server, 
  Download, 
  Upload, 
  Save, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  Link as LinkIcon,
  Activity
} from "lucide-react";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 1. Sistem Genel Durumu & 2. Etkileşimli Gönderim Modu
  const [systemActive, setSystemActive] = useState(true);
  const [interactiveModeOnly, setInteractiveModeOnly] = useState(false);

  // 3. Sesli Mesaj & Yapay Zeka (TTS)
  const [ttsEngine, setTtsEngine] = useState("edge_ai");
  const [voiceCharacter, setVoiceCharacter] = useState("tr-TR-AhmetNeural");
  const [azureKey, setAzureKey] = useState("");
  const [azureRegion, setAzureRegion] = useState("westeurope");

  // 5. Evolution API Bağlantı Ayarları
  const [evoUrl, setEvoUrl] = useState("http://10.0.201.201:3800");
  const [evoApiKey, setEvoApiKey] = useState("16f54b4d7f24e095e8e88761f3bc993d863cafced9d6f99939824d28a206726a");
  const [evoInstance, setEvoInstance] = useState("ff");

  // 6. Webhook Ayarı
  const [webhookActive, setWebhookActive] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState("https://mesaj.cakirlar.net/api/webhook");

  // WhatsApp Durumu & QR
  const [connectionState, setConnectionState] = useState<string>("close");
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // 7. Otomatik Gönderim Görevleri & Tetikleyiciler
  const [morningActive, setMorningActive] = useState(true);
  const [morningTime, setMorningTime] = useState("08:00");
  const [eveningActive, setEveningActive] = useState(true);
  const [eveningTime, setEveningTime] = useState("20:00");
  const [fridayActive, setFridayActive] = useState(true);
  const [fridayTime, setFridayTime] = useState("10:00");
  const [quietHoursStart, setQuietHoursStart] = useState("21:00");
  const [quietHoursEnd, setQuietHoursEnd] = useState("08:30");
  const [minDelay, setMinDelay] = useState(5);
  const [maxDelay, setMaxDelay] = useState(15);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const [setRes, evoRes] = await Promise.all([
        fetch("/api/settings"),
        fetch("/api/evolution/status?instance=ff")
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
      morning_time: morningTime,
      evening_time: eveningTime,
      friday_time: fridayTime,
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
        setStatusMsg({ type: "success", text: "WhatsPulse sistem ve bağlantı ayarları başarıyla kaydedildi." });
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
      const res = await fetch(`/api/evolution/qr?instance=${encodeURIComponent(evoInstance || 'ff')}&refresh=true`);
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
    if (!confirm(`"${evoInstance || 'ff'}" WhatsApp oturumunu kapatmak istediğinize emin misiniz?`)) return;
    setLoggingOut(true);
    try {
      const res = await fetch("/api/evolution/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceName: evoInstance || 'ff' })
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-[#121517] border border-[#23292e] shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#d4af37]/15 text-[#d4af37] text-xs font-bold border border-[#d4af37]/30 font-serif-title">
              SİSTEM & YAPILANDIRMA
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-1 font-serif-title">
            WhatsPulse Ayarlar & Bağlantı Yönetimi
          </h1>
          <p className="text-xs text-gray-400">
            Evolution API (Instance: ff), Webhook, Sesli Mesaj AI (TTS), Zamanlayıcılar ve Veritabanı Yedekleme.
          </p>
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#10b981] hover:from-[#e5c158] hover:to-[#059669] text-black font-extrabold text-xs shadow-lg shadow-[#d4af37]/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Save className="w-4 h-4 text-black" />
          <span>{saving ? "Kaydediliyor..." : "Tüm Ayarları Kaydet"}</span>
        </button>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-bold shadow-md ${
          statusMsg.type === "success"
            ? "bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30"
            : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
        }`}>
          {statusMsg.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* 1 & 2. Sistem Genel Durumu & Etkileşimli Gönderim Modu */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[#121517] border border-[#23292e] shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#23292e]">
            <Power className="w-5 h-5 text-[#d4af37]" />
            <h2 className="text-sm font-bold text-white font-serif-title">
              1. Sistem Genel Durumu & Etkileşimli Gönderim Modu
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. Sistem Genel Durumu Toggle */}
            <div className="p-4 rounded-2xl bg-[#161a1d] border border-[#2e353c] flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white font-serif-title">Sistem Genel Durumu</div>
                <div className="text-[11px] text-gray-400">Tüm planlı bildirim ve mesajlaşma servislerini aç/kapa.</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={systemActive}
                  onChange={(e) => setSystemActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#10b981]"></div>
              </label>
            </div>

            {/* 2. Etkileşimli Gönderim Modu Toggle */}
            <div className="p-4 rounded-2xl bg-[#161a1d] border border-[#2e353c] flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white font-serif-title">Etkileşimli Gönderim Modu</div>
                <div className="text-[11px] text-gray-400">Yalnızca WhatsApp onaylı veya yanıt veren kişilere yayın yap.</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={interactiveModeOnly}
                  onChange={(e) => setInteractiveModeOnly(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#d4af37]"></div>
              </label>
            </div>
          </div>
        </div>

        {/* 3. 🔊 Sesli Mesaj Yapay Zeka Ayarları (TTS) */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[#121517] border border-[#23292e] shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#23292e]">
            <Mic className="w-5 h-5 text-[#10b981]" />
            <h2 className="text-sm font-bold text-white font-serif-title">
              3. 🔊 Sesli Mesaj Yapay Zeka Ayarları (TTS)
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1 font-serif-title">Seslendirme Motoru (TTS)</label>
              <select
                value={ttsEngine}
                onChange={(e) => setTtsEngine(e.target.value)}
                className="w-full bg-[#181c1f] border border-[#2e353c] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#d4af37] cursor-pointer"
              >
                <option value="edge_ai">Microsoft Edge AI (Neural - Doğal ve Akıcı)</option>
                <option value="google_tts">Google Cloud Text-to-Speech</option>
                <option value="azure_speech">Microsoft Azure AI Speech</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1 font-serif-title">Seslendirme Karakteri / Tonu</label>
              <select
                value={voiceCharacter}
                onChange={(e) => setVoiceCharacter(e.target.value)}
                className="w-full bg-[#181c1f] border border-[#2e353c] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#d4af37] cursor-pointer"
              >
                <option value="tr-TR-AhmetNeural">Ahmet (Vakur, Tok Erkek Sesi - Önerilen)</option>
                <option value="tr-TR-EmelNeural">Emel (Akıcı Kadın Sesi)</option>
                <option value="tr-TR-SelmaNeural">Selma (Kurumsal Kadın Sesi)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1 font-serif-title">Azure Speech Key</label>
              <input
                type="password"
                placeholder="İsteğe bağlı Azure Speech Key..."
                value={azureKey}
                onChange={(e) => setAzureKey(e.target.value)}
                className="w-full bg-[#181c1f] border border-[#2e353c] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#d4af37]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1 font-serif-title">Azure Region</label>
              <input
                type="text"
                placeholder="westeurope"
                value={azureRegion}
                onChange={(e) => setAzureRegion(e.target.value)}
                className="w-full bg-[#181c1f] border border-[#2e353c] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#d4af37]"
              />
            </div>
          </div>
        </div>

        {/* 4. 💾 Sistem Sağlığı & Bağlantılar */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[#121517] border border-[#23292e] shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#23292e]">
            <Server className="w-5 h-5 text-[#10b981]" />
            <h2 className="text-sm font-bold text-white font-serif-title">
              4. 💾 Sistem Sağlığı & Bağlantılar
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#161a1d] border border-[#2e353c] space-y-1">
              <div className="text-[11px] text-gray-400">PostgreSQL Veritabanı</div>
              <div className="text-xs font-bold text-[#10b981] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Çalışıyor / Bağlı
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#161a1d] border border-[#2e353c] space-y-1">
              <div className="text-[11px] text-gray-400">Redis Bellek & Kuyruk</div>
              <div className="text-xs font-bold text-[#10b981] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Çalışıyor / Bağlı
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#161a1d] border border-[#2e353c] space-y-1">
              <div className="text-[11px] text-gray-400">Evolution API (WhatsApp)</div>
              <div className="text-xs font-bold text-[#10b981] flex items-center gap-1 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5" /> {isConnected ? "Çalışıyor / Bağlı (ff: open)" : "Kopuk"}
              </div>
            </div>
          </div>
        </div>

        {/* 5. 📱 Evolution API Bağlantı Ayarları (ff) */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[#121517] border border-[#23292e] shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#23292e]">
            <div className="flex items-center gap-2">
              <Wifi className="w-5 h-5 text-[#d4af37]" />
              <h2 className="text-sm font-bold text-white font-serif-title">
                5. 📱 Evolution API Bağlantı Ayarları (Instance: ff)
              </h2>
            </div>

            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase font-mono border ${
              isConnected 
                ? "bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30"
                : "bg-rose-500/20 text-rose-400 border-rose-500/30"
            }`}>
              {isConnected ? "BAĞLI (AÇIK - ff)" : "KOPUK"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1 font-serif-title">API URL *</label>
              <input
                type="text"
                required
                value={evoUrl}
                onChange={(e) => setEvoUrl(e.target.value)}
                placeholder="http://10.0.201.201:3800"
                className="w-full bg-[#181c1f] border border-[#2e353c] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#d4af37]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1 font-serif-title">API Key (Global Key) *</label>
              <input
                type="password"
                required
                value={evoApiKey}
                onChange={(e) => setEvoApiKey(e.target.value)}
                className="w-full bg-[#181c1f] border border-[#2e353c] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#d4af37]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1 font-serif-title">Instance Adı *</label>
              <input
                type="text"
                required
                value={evoInstance}
                onChange={(e) => setEvoInstance(e.target.value)}
                placeholder="ff"
                className="w-full bg-[#181c1f] border border-[#2e353c] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#d4af37]"
              />
            </div>
          </div>

          {/* Connection Actions & QR Code */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b89528] text-black text-xs font-black shadow-md cursor-pointer"
              >
                WhatsApp Ayarlarını Kaydet
              </button>

              {isConnected ? (
                <button
                  type="button"
                  onClick={handleLogoutInstance}
                  disabled={loggingOut}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{loggingOut ? "Kapatılıyor..." : "Oturumu Kapat"}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFetchQr}
                  disabled={loadingQr}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#10b981] hover:bg-[#059669] text-white text-xs font-black shadow-lg cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  <span>{loadingQr ? "QR Üretiliyor..." : "QR Kodu Göster / Bağlan"}</span>
                </button>
              )}
            </div>

            {qrCodeData && (
              <div className="p-4 rounded-2xl bg-[#0b0d0e] border border-[#d4af37]/40 text-center space-y-2 w-full mt-3">
                <div className="text-xs font-bold text-[#d4af37]">WhatsApp &gt; Bağlı Cihazlar &gt; Cihaz Bağla</div>
                <div className="bg-white p-3 rounded-2xl inline-block shadow-2xl">
                  <img
                    src={qrCodeData.startsWith("data:") ? qrCodeData : `data:image/png;base64,${qrCodeData}`}
                    alt="WhatsApp QR"
                    className="w-52 h-52 mx-auto object-contain"
                  />
                </div>
                <p className="text-[11px] text-gray-400">Telefonunuzun WhatsApp uygulamasından QR kodu okutun.</p>
              </div>
            )}
          </div>
        </div>

        {/* 6. 🔗 Webhook Ayarı */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[#121517] border border-[#23292e] shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#23292e]">
            <div className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-[#10b981]" />
              <h2 className="text-sm font-bold text-white font-serif-title">
                6. 🔗 Webhook Ayarı
              </h2>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={webhookActive}
                onChange={(e) => setWebhookActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#10b981]"></div>
            </label>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2">
            <input
              type="text"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://mesaj.cakirlar.net/api/webhook"
              className="flex-1 w-full bg-[#181c1f] border border-[#2e353c] rounded-xl px-3 py-2.5 text-xs text-white font-mono"
            />
            <button
              type="button"
              onClick={() => setWebhookUrl("https://mesaj.cakirlar.net/api/webhook")}
              className="px-3 py-2.5 rounded-xl bg-[#181c1f] hover:bg-[#202529] text-[#d4af37] border border-[#d4af37]/30 text-xs font-bold shrink-0 cursor-pointer"
            >
              🔍 Otomatik Algıla
            </button>
            <button
              type="button"
              onClick={handleSaveSettings}
              className="px-4 py-2.5 rounded-xl bg-[#10b981] hover:bg-[#059669] text-white text-xs font-bold shrink-0 cursor-pointer shadow-md"
            >
              🔗 Webhook URL Kaydet
            </button>
          </div>
        </div>

        {/* 7. ⏰ Otomatik Gönderim Görevleri & Tetikleyiciler */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[#121517] border border-[#23292e] shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#23292e]">
            <Clock className="w-5 h-5 text-[#d4af37]" />
            <h2 className="text-sm font-bold text-white font-serif-title">
              7. ⏰ Otomatik Gönderim Görevleri & Tetikleyiciler
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-[#161a1d] border border-[#2e353c] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#d4af37] font-serif-title">Sabah Bildirimi</span>
                <input
                  type="checkbox"
                  checked={morningActive}
                  onChange={(e) => setMorningActive(e.target.checked)}
                  className="w-4 h-4 accent-[#d4af37]"
                />
              </div>
              <div className="text-[11px] text-gray-400">Hedef Grup: Tüm Aboneler</div>
              <input
                type="time"
                value={morningTime}
                onChange={(e) => setMorningTime(e.target.value)}
                className="w-full bg-[#181c1f] border border-[#2e353c] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
              />
            </div>

            <div className="p-4 rounded-2xl bg-[#161a1d] border border-[#2e353c] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#d4af37] font-serif-title">Akşam Bildirimi</span>
                <input
                  type="checkbox"
                  checked={eveningActive}
                  onChange={(e) => setEveningActive(e.target.checked)}
                  className="w-4 h-4 accent-[#d4af37]"
                />
              </div>
              <div className="text-[11px] text-gray-400">Hedef Grup: Tüm Aboneler</div>
              <input
                type="time"
                value={eveningTime}
                onChange={(e) => setEveningTime(e.target.value)}
                className="w-full bg-[#181c1f] border border-[#2e353c] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
              />
            </div>

            <div className="p-4 rounded-2xl bg-[#161a1d] border border-[#2e353c] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#10b981] font-serif-title">Cuma Özel Tebriği</span>
                <input
                  type="checkbox"
                  checked={fridayActive}
                  onChange={(e) => setFridayActive(e.target.checked)}
                  className="w-4 h-4 accent-[#10b981]"
                />
              </div>
              <div className="text-[11px] text-gray-400">Hedef Grup: Tüm Aboneler</div>
              <input
                type="time"
                value={fridayTime}
                onChange={(e) => setFridayTime(e.target.value)}
                className="w-full bg-[#181c1f] border border-[#2e353c] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-[#161a1d] border border-[#2e353c] space-y-2">
              <div className="text-xs font-bold text-[#d4af37] flex items-center gap-1.5 font-serif-title">
                <Clock className="w-4 h-4 text-[#d4af37]" />
                <span>Sessiz Saatler (21:00 - 08:30)</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="text-[10px] text-gray-400 block">Başlangıç</label>
                  <input
                    type="time"
                    value={quietHoursStart}
                    onChange={(e) => setQuietHoursStart(e.target.value)}
                    className="w-full bg-[#181c1f] border border-[#2e353c] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block">Bitiş</label>
                  <input
                    type="time"
                    value={quietHoursEnd}
                    onChange={(e) => setQuietHoursEnd(e.target.value)}
                    className="w-full bg-[#181c1f] border border-[#2e353c] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#161a1d] border border-[#2e353c] space-y-2">
              <div className="text-xs font-bold text-[#10b981] flex items-center gap-1.5 font-serif-title">
                <ShieldCheck className="w-4 h-4 text-[#10b981]" />
                <span>Anti-Spam Gecikmesi</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="text-[10px] text-gray-400 block">Min Gecikme (5 sn)</label>
                  <input
                    type="number"
                    min={2}
                    value={minDelay}
                    onChange={(e) => setMinDelay(Number(e.target.value))}
                    className="w-full bg-[#181c1f] border border-[#2e353c] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block">Max Gecikme (15 sn)</label>
                  <input
                    type="number"
                    min={minDelay}
                    value={maxDelay}
                    onChange={(e) => setMaxDelay(Number(e.target.value))}
                    className="w-full bg-[#181c1f] border border-[#2e353c] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 8. 🗄️ Veri Yedekleme & Geri Yükleme */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[#121517] border border-[#23292e] shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#23292e]">
            <Database className="w-5 h-5 text-[#d4af37]" />
            <h2 className="text-sm font-bold text-white font-serif-title">
              8. 🗄️ Veri Yedekleme & Geri Yükleme
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-[#161a1d] border border-[#2e353c] flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white font-serif-title">Veritabanı Yedeği İndir</div>
                <div className="text-[11px] text-gray-400">Tüm aboneleri, grupları ve ayarları JSON formatında yedekleyin.</div>
              </div>
              <a
                href="/api/admin/backup"
                download
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#d4af37] hover:bg-[#e5c158] text-black text-xs font-black shadow-md cursor-pointer shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-black" />
                <span>📥 Yedeği İndir (.json)</span>
              </a>
            </div>

            <div className="p-4 rounded-2xl bg-[#161a1d] border border-[#2e353c] flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white font-serif-title">Yedek Dosyası Geri Yükle</div>
                <div className="text-[11px] text-gray-400">Önceki bir JSON yedeğini veritabanına aktarın.</div>
              </div>
              <label className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#181c1f] hover:bg-[#202529] text-[#10b981] border border-[#10b981]/30 text-xs font-bold shadow-md cursor-pointer shrink-0">
                <Upload className="w-3.5 h-3.5" />
                <span>📤 Yedek Yükle (.json)</span>
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
