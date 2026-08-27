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

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();

      if (data.evolution_api) {
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

      checkEvolutionStatus();
    } catch (err) {
      console.error(err);
    }
  };

  const checkEvolutionStatus = async () => {
    try {
      setTestingConnection(true);
      const res = await fetch('/api/evolution/status');
      const data = await res.json();
      setConnectionState(data.state || (data.success ? 'CONNECTED' : 'DISCONNECTED'));
    } catch (err) {
      setConnectionState('DISCONNECTED');
    } finally {
      setTestingConnection(false);
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
      checkEvolutionStatus();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'Hata: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

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
      <div className="bg-[#111b21] border border-gray-800 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Wifi className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Harici Evolution API Bağlantısı</h2>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
              connectionState === 'open' || connectionState === 'CONNECTED'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}>
              Durum: {connectionState}
            </span>
            <button
              onClick={checkEvolutionStatus}
              disabled={testingConnection}
              className="p-1.5 rounded-lg bg-gray-800 text-gray-300 hover:text-white"
              title="Yenile"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
            </button>
          </div>
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
            <label className="block text-xs font-semibold text-gray-400 mb-1">Instance Adı</label>
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
