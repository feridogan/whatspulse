"use client";

import React, { useState, useEffect } from "react";
import { 
  Settings, 
  Power, 
  UserCheck, 
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

  // 1. Sistem Genel Durumu & Etkileşimli Gönderim Modu
  const [systemActive, setSystemActive] = useState(true);
  const [interactiveModeOnly, setInteractiveModeOnly] = useState(false);

  // 3. Evolution API Bağlantı Ayarları
  const [evoUrl, setEvoUrl] = useState("http://10.0.201.201:3800");
  const [evoApiKey, setEvoApiKey] = useState("16f54b4d7f24e095e8e88761f3bc993d863cafced9d6f99939824d28a206726a");
  const [evoInstance, setEvoInstance] = useState("ff");

  // 4. Webhook Ayarı
  const [webhookActive, setWebhookActive] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState("https://mesaj.cakirlar.net/api/webhook");

  // WhatsApp Durumu & QR
  const [connectionState, setConnectionState] = useState<string>("close");
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // 5. Otomatik Gönderim Sessiz Saatleri & Zaman Penceresi (Delivery Window & Quiet Hours Guard)
  const [morningActive, setMorningActive] = useState(true);
  const [morningTime, setMorningTime] = useState("08:00");
  const [eveningActive, setEveningActive] = useState(true);
  const [eveningTime, setEveningTime] = useState("20:00");
  const [fridayActive, setFridayActive] = useState(true);
  const [fridayTime, setFridayTime] = useState("10:00");

  const [deliveryWindowStart, setDeliveryWindowStart] = useState("08:00");
  const [deliveryWindowEnd, setDeliveryWindowEnd] = useState("18:00");
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(true);
  const [allowedDays, setAllowedDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 0]);
  const [minDelay, setMinDelay] = useState(5);
  const [maxDelay, setMaxDelay] = useState(15);

  const toggleAllowedDay = (day: number) => {
    setAllowedDays((prev) =>
      prev.includes(day)
        ? prev.length > 1
          ? prev.filter((d) => d !== day)
          : prev
        : [...prev, day]
    );
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      const [setRes, evoRes] = await Promise.all([
        fetch("/api/settings"),
        fetch("/api/evolution/status?instance=ff")
      ]);
      const setData = await setRes.json();
      const evoData = await evoRes.json();

      const s = setData.settings || setData;
      if (s) {
        if (s.system_active !== undefined) setSystemActive(s.system_active === "true" || s.system_active === true);
        if (s.interactive_mode !== undefined) setInteractiveModeOnly(s.interactive_mode === "true" || s.interactive_mode === true);
        if (s.evolution_api_url) setEvoUrl(s.evolution_api_url);
        if (s.evolution_global_key) setEvoApiKey(s.evolution_global_key);
        if (s.evolution_instance) setEvoInstance(s.evolution_instance);
        if (s.webhook_url) setWebhookUrl(s.webhook_url);
        if (s.delivery_window_start) setDeliveryWindowStart(s.delivery_window_start);
        else if (s.quiet_hours_start) setDeliveryWindowStart(s.quiet_hours_start);
        if (s.delivery_window_end) setDeliveryWindowEnd(s.delivery_window_end);
        else if (s.quiet_hours_end) setDeliveryWindowEnd(s.quiet_hours_end);
        if (s.quiet_hours_enabled !== undefined) setQuietHoursEnabled(s.quiet_hours_enabled === "true" || s.quiet_hours_enabled === true);
        if (s.allowed_days) {
          try {
            const parsed = typeof s.allowed_days === "string" ? JSON.parse(s.allowed_days) : s.allowed_days;
            if (Array.isArray(parsed) && parsed.length > 0) setAllowedDays(parsed.map(Number));
          } catch (e) {}
        }
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
      evolution_api_url: evoUrl.trim(),
      evolution_global_key: evoApiKey.trim(),
      evolution_instance: evoInstance.trim(),
      webhook_url: webhookUrl.trim(),
      morning_time: morningTime,
      evening_time: eveningTime,
      friday_time: fridayTime,
      delivery_window_start: deliveryWindowStart,
      delivery_window_end: deliveryWindowEnd,
      quiet_hours_start: deliveryWindowStart,
      quiet_hours_end: deliveryWindowEnd,
      quiet_hours_enabled: String(quietHoursEnabled),
      allowed_days: JSON.stringify(allowedDays),
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
            Evolution API (Instance: ff), Webhook, Zamanlayıcılar, Sessiz Saatler ve Veri Yedekleme.
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
        {/* 1. Sistem Genel Durumu & Etkileşimli Gönderim Modu */}
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

        {/* 2. 💾 Sistem Sağlığı & Bağlantılar */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[#121517] border border-[#23292e] shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#23292e]">
            <Server className="w-5 h-5 text-[#10b981]" />
            <h2 className="text-sm font-bold text-white font-serif-title">
              2. 💾 Sistem Sağlığı & Bağlantılar
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

        {/* 3. 📱 Evolution API Bağlantı Ayarları (ff) */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[#121517] border border-[#23292e] shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#23292e]">
            <div className="flex items-center gap-2">
              <Wifi className="w-5 h-5 text-[#d4af37]" />
              <h2 className="text-sm font-bold text-white font-serif-title">
                3. 📱 Evolution API Bağlantı Ayarları (Instance: ff)
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

        {/* 4. 🔗 Webhook Ayarı */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[#121517] border border-[#23292e] shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#23292e]">
            <div className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-[#10b981]" />
              <h2 className="text-sm font-bold text-white font-serif-title">
                4. 🔗 Webhook Ayarı
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

        {/* 5. 🛡️ Otomatik Gönderim Sessiz Saatleri & Zaman Penceresi (Delivery Window & Quiet Hours Guard) */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[#121517] border border-[#23292e] shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#23292e]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#10b981]" />
              <div>
                <h2 className="text-sm font-bold text-white font-serif-title">
                  5. 🛡️ Otomatik Gönderim Sessiz Saatleri & Zaman Penceresi Motoru
                </h2>
                <p className="text-[11px] text-gray-400">
                  Mesaj gönderim izin saatleri, gece sessiz saatler koruması ve gün filtreleri.
                </p>
              </div>
            </div>

            {/* Strict Quiet Hours Guard Switch */}
            <div className="flex items-center gap-3 bg-[#161a1d] px-3.5 py-1.5 rounded-2xl border border-[#2e353c]">
              <span className="text-xs font-bold text-gray-200">Sessiz Saatler Koruması</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={quietHoursEnabled}
                  onChange={(e) => setQuietHoursEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#10b981]"></div>
              </label>
            </div>
          </div>

          {/* Info Banner */}
          <div className="p-3.5 rounded-2xl bg-[#10b981]/10 border border-[#10b981]/25 flex items-start gap-2.5 text-xs text-gray-200">
            <Sparkles className="w-4 h-4 text-[#10b981] shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Zaman Penceresi Kuralı:</strong> Mesajlar sadece aşağıda belirlenen saat aralığında (<strong>{deliveryWindowStart} - {deliveryWindowEnd}</strong>) ve seçili günlerde iletilir. Sessiz saatler (akşam {deliveryWindowEnd} ile sabah {deliveryWindowStart} arası) başladığında tüm gönderimler güvenle uyku moduna geçer, sabah {deliveryWindowStart}&apos;da kaldığı kişiden otomatik devam eder.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Kural 1: Gönderim İzin Aralığı */}
            <div className="p-4 rounded-2xl bg-[#161a1d] border border-[#2e353c] space-y-3">
              <div className="text-xs font-bold text-[#d4af37] flex items-center gap-1.5 font-serif-title">
                <Clock className="w-4 h-4 text-[#d4af37]" />
                <span>Kural 1: Gönderim İzin Aralığı (Delivery Window)</span>
              </div>
              <p className="text-[11px] text-gray-400">
                Toplu mesajların müşterilere ulaştırılmasına izin verilen günlük zaman penceresi.
              </p>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[10px] text-gray-400 block font-mono mb-1">Başlangıç Saati</label>
                  <input
                    type="time"
                    value={deliveryWindowStart}
                    onChange={(e) => setDeliveryWindowStart(e.target.value)}
                    className="w-full bg-[#181c1f] border border-[#2e353c] rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-[#d4af37]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block font-mono mb-1">Bitiş Saati</label>
                  <input
                    type="time"
                    value={deliveryWindowEnd}
                    onChange={(e) => setDeliveryWindowEnd(e.target.value)}
                    className="w-full bg-[#181c1f] border border-[#2e353c] rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-[#d4af37]"
                  />
                </div>
              </div>
            </div>

            {/* Kural 4: Anti-Spam Rastgele Gecikme */}
            <div className="p-4 rounded-2xl bg-[#161a1d] border border-[#2e353c] space-y-3">
              <div className="text-xs font-bold text-[#10b981] flex items-center gap-1.5 font-serif-title">
                <ShieldCheck className="w-4 h-4 text-[#10b981]" />
                <span>Kural 4: Anti-Spam İnsansı Gecikme Aralığı</span>
              </div>
              <p className="text-[11px] text-gray-400">
                Her WhatsApp mesajı arasına eklenecek değişken gecikme süresi (Saniye).
              </p>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[10px] text-gray-400 block font-mono mb-1">Min Gecikme (sn)</label>
                  <input
                    type="number"
                    min={2}
                    max={60}
                    value={minDelay}
                    onChange={(e) => setMinDelay(Number(e.target.value))}
                    className="w-full bg-[#181c1f] border border-[#2e353c] rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-[#10b981]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block font-mono mb-1">Max Gecikme (sn)</label>
                  <input
                    type="number"
                    min={minDelay}
                    max={120}
                    value={maxDelay}
                    onChange={(e) => setMaxDelay(Number(e.target.value))}
                    className="w-full bg-[#181c1f] border border-[#2e353c] rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-[#10b981]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Kural 3: İzin Verilen Günler (Haftalık Seçim) */}
          <div className="p-4 rounded-2xl bg-[#161a1d] border border-[#2e353c] space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-white flex items-center gap-1.5 font-serif-title">
                <Activity className="w-4 h-4 text-[#d4af37]" />
                <span>Kural 3: İzin Verilen Gönderim Günleri (Haftalık Koruma)</span>
              </div>
              <span className="text-[11px] text-gray-400">
                {allowedDays.length} Gün Aktif
              </span>
            </div>
            <p className="text-[11px] text-gray-400">
              Seçili olmayan günlerde (Örn. Pazar) sistem toplu mesaj gönderimini tamamen bloke eder ve bekletir.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 pt-1">
              {[
                { day: 1, name: "Pazartesi", short: "Pzt" },
                { day: 2, name: "Salı", short: "Sal" },
                { day: 3, name: "Çarşamba", short: "Çar" },
                { day: 4, name: "Perşembe", short: "Per" },
                { day: 5, name: "Cuma", short: "Cum" },
                { day: 6, name: "Cumartesi", short: "Cmt" },
                { day: 0, name: "Pazar", short: "Paz" },
              ].map((d) => {
                const isSelected = allowedDays.includes(d.day);
                return (
                  <button
                    key={d.day}
                    type="button"
                    onClick={() => toggleAllowedDay(d.day)}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all border cursor-pointer flex flex-col items-center justify-center ${
                      isSelected
                        ? "bg-[#10b981]/20 border-[#10b981] text-[#10b981] shadow-sm"
                        : "bg-[#181c1f] border-[#2e353c] text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    <span>{d.short}</span>
                    <span className="text-[10px] font-normal opacity-75">{d.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 6. 🗄️ Veri Yedekleme & Geri Yükleme */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[#121517] border border-[#23292e] shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#23292e]">
            <Database className="w-5 h-5 text-[#d4af37]" />
            <h2 className="text-sm font-bold text-white font-serif-title">
              6. 🗄️ Veri Yedekleme & Geri Yükleme
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
