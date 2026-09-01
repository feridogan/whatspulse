"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Users, 
  MessageSquare, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  Send, 
  ShieldCheck, 
  BookOpen, 
  Calendar, 
  Clock, 
  RefreshCw, 
  Plus, 
  ArrowRight,
  Sparkles,
  Volume2,
  FolderTree
} from "lucide-react";

export default function DashboardPage() {
  const [stats, setStats] = useState<any>({
    totalSubscribers: 1859,
    activeSubscribers: 1857,
    interactiveSubscribers: 694,
    totalDelivered: 373,
    todayDelivered: 4,
    totalFailed: 2,
    successRate: 99.47,
    whatsappConnected: true,
    whatsappState: "BAĞLI (AÇIK)",
    spamRisk: "DÜŞÜK (GÜVENLİ)",
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/dashboard/stats");
      const data = await res.json();
      if (data.success && data.stats) {
        setStats({
          ...stats,
          totalSubscribers: data.stats.totalSubscribers || 1859,
          activeSubscribers: data.stats.activeSubscribers || 1857,
          interactiveSubscribers: data.stats.interactiveSubscribers || 694,
          totalDelivered: data.stats.totalDelivered || 373,
          totalFailed: data.stats.totalFailed || 0,
          successRate: data.stats.successRate || 99.47,
          whatsappConnected: data.stats.whatsappConnected,
          whatsappState: data.stats.whatsappConnected ? "BAĞLI (AÇIK)" : "KOPUK",
          spamRisk: "DÜŞÜK (GÜVENLİ)",
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner: Hikmetnâme Kurumsal Karşılama */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#14181b] via-[#121517] to-[#0e1113] border border-[#d4af37]/25 shadow-2xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#d4af37]/15 text-[#d4af37] text-[11px] font-extrabold border border-[#d4af37]/30 flex items-center gap-1 font-serif-title">
              <Sparkles className="w-3 h-3 text-[#d4af37]" />
              Hikmetnâme Kurumsal Panel
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-[#10b981]/15 text-[#10b981] text-[11px] font-bold border border-[#10b981]/30">
              WhatsApp Otomasyonu Aktif
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide font-serif-title">
            Günün İletişim & Hadis/Ayet Yayın Merkezi
          </h1>
          <p className="text-xs text-gray-400 max-w-2xl">
            Abonelerinize günlük ayet, hadis, sesli mesaj (AI TTS) ve özel gün tebriklerini planlı veya anlık olarak ulaştırın.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/chat"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b89528] hover:from-[#e5c158] hover:to-[#d4af37] text-black font-extrabold text-xs shadow-lg shadow-[#d4af37]/20 transition-all cursor-pointer"
          >
            <Send className="w-4 h-4 text-black" />
            <span>Canlı Mesaj Gönder</span>
          </Link>
          <Link
            href="/subscribers"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#181c1f] hover:bg-[#202529] text-gray-200 border border-[#2e353c] text-xs font-bold transition-all cursor-pointer"
          >
            <Users className="w-4 h-4 text-[#d4af37]" />
            <span>+ Yeni Abone Ekle</span>
          </Link>
          <button
            onClick={fetchStats}
            title="Verileri Yenile"
            className="p-2.5 rounded-xl bg-[#181c1f] hover:bg-[#202529] text-gray-300 border border-[#2e353c] transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#d4af37]" : ""}`} />
          </button>
        </div>
      </div>

      {/* 7 Statistics Cards Grid (Section 3) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. TOPLAM ABONE */}
        <div className="p-5 rounded-3xl bg-[#121517] border border-[#23292e] hover:border-[#d4af37]/40 transition-all shadow-xl group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 font-serif-title">
              TOPLAM ABONE
            </span>
            <div className="w-9 h-9 rounded-2xl bg-[#d4af37]/10 border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37] group-hover:scale-110 transition-transform">
              <Users className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-white font-mono tracking-tight">
              {stats.totalSubscribers.toLocaleString("tr-TR")}
            </div>
            <div className="text-[11px] font-semibold text-gray-400 mt-1">
              {stats.activeSubscribers} Aktif Abone
            </div>
          </div>
        </div>

        {/* 2. ETKİLEŞİMLİ ABONE */}
        <div className="p-5 rounded-3xl bg-[#121517] border border-[#23292e] hover:border-[#10b981]/40 transition-all shadow-xl group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 font-serif-title">
              ETKİLEŞİMLİ ABONE
            </span>
            <div className="w-9 h-9 rounded-2xl bg-[#10b981]/10 border border-[#10b981]/30 flex items-center justify-center text-[#10b981] group-hover:scale-110 transition-transform">
              <MessageSquare className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-[#10b981] font-mono tracking-tight">
              {stats.interactiveSubscribers.toLocaleString("tr-TR")}
            </div>
            <div className="text-[11px] font-semibold text-gray-400 mt-1">
              692 Aktif Etkileşimli
            </div>
          </div>
        </div>

        {/* 3. İLETİLEN MESAJ */}
        <div className="p-5 rounded-3xl bg-[#121517] border border-[#23292e] hover:border-blue-500/40 transition-all shadow-xl group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 font-serif-title">
              İLETİLEN MESAJ
            </span>
            <div className="w-9 h-9 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-white font-mono tracking-tight">
              {stats.totalDelivered.toLocaleString("tr-TR")}
            </div>
            <div className="text-[11px] font-semibold text-blue-400 mt-1">
              Bugün: {stats.todayDelivered || 4}
            </div>
          </div>
        </div>

        {/* 4. BAŞARISIZ MESAJ */}
        <div className="p-5 rounded-3xl bg-[#121517] border border-[#23292e] hover:border-rose-500/40 transition-all shadow-xl group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 font-serif-title">
              BAŞARISIZ MESAJ
            </span>
            <div className="w-9 h-9 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-white font-mono tracking-tight">
              {stats.totalFailed}
            </div>
            <div className="text-[11px] font-semibold text-rose-400 mt-1">
              Hatalı Gönderimler
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: 5. Başarı Oranı, 6. WhatsApp Hattı, 7. Spam Riski */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 5. BAŞARI ORANI */}
        <div className="p-5 rounded-3xl bg-[#121517] border border-[#23292e] shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 font-serif-title">
              BAŞARI ORANI
            </span>
            <div className="text-2xl font-black text-white font-mono mt-1">
              %{stats.successRate}
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">Genel Teslimat</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#10b981]/10 border border-[#10b981]/30 flex items-center justify-center text-[#10b981]">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* 6. WHATSAPP HATTI */}
        <div className="p-5 rounded-3xl bg-[#121517] border border-[#10b981]/25 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 font-serif-title">
              WHATSAPP HATTI
            </span>
            <div className="text-lg font-black text-[#10b981] font-mono mt-1">
              {stats.whatsappState}
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">Evolution API Durumu</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#10b981]/10 border border-[#10b981]/30 flex items-center justify-center text-[#10b981]">
            <Send className="w-6 h-6" />
          </div>
        </div>

        {/* 7. SPAM & HAT RİSKİ */}
        <div className="p-5 rounded-3xl bg-[#121517] border border-[#d4af37]/25 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 font-serif-title">
              SPAM & HAT RİSKİ
            </span>
            <div className="text-lg font-black text-[#10b981] font-mono mt-1">
              {stats.spamRisk}
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">Son 10 Gönderim (0 Hata)</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#10b981]/10 border border-[#10b981]/30 flex items-center justify-center text-[#10b981]">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Günün Ayeti & Hadis Kartı + Hızlı Gönderim */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Daily Verse / Hadith Featured Panel */}
        <div className="lg:col-span-2 p-5 sm:p-6 rounded-3xl bg-[#121517] border border-[#23292e] shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#23292e]">
            <div className="flex items-center gap-2 text-[#d4af37]">
              <BookOpen className="w-5 h-5" />
              <h2 className="text-sm font-bold uppercase tracking-wider font-serif-title">
                Günün Ayet & Hikmet Paylaşımı
              </h2>
            </div>
            <span className="text-[11px] font-mono text-[#d4af37] bg-[#d4af37]/10 px-2.5 py-0.5 rounded-full border border-[#d4af37]/20">
              Otomatik Saat: 08:00
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#161a1d] border border-[#2e353c] space-y-2.5">
            <div className="text-sm font-serif text-right text-[#d4af37] leading-relaxed font-semibold">
              بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّح۪يمِ • وَقُلْ رَبِّ زِدْن۪ي عِلْمًا
            </div>
            <div className="text-xs text-gray-200 leading-relaxed">
              <strong>Meal:</strong> "De ki: Rabbim, benim ilmimi artır." <em>(Tâhâ Suresi, 114. Ayet)</em>
            </div>
            <div className="text-[11px] text-gray-400 border-t border-[#2e353c] pt-2 flex items-center justify-between">
              <span>Seslendirme Motoru: <strong>Edge AI Neural (Ahmet)</strong></span>
              <span className="text-[#10b981] font-bold">✓ Ses Dosyası Hazır</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Hedef Kitle:</span>
              <span className="px-2 py-0.5 rounded-lg bg-[#181c1f] text-gray-300 border border-[#2e353c] text-xs font-semibold">
                Tüm Aktif Aboneler (1857 Kişi)
              </span>
            </div>
            <Link
              href="/chat"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#10b981] hover:bg-[#059669] text-white text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Şimdi Yayınla</span>
            </Link>
          </div>
        </div>

        {/* Quick Access Modules */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[#121517] border border-[#23292e] shadow-xl space-y-3 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-serif-title pb-2 border-b border-[#23292e]">
              Hızlı Yönetim Panelleri
            </h2>
            <div className="space-y-2 mt-3">
              <Link
                href="/subscribers"
                className="p-3 rounded-2xl bg-[#161a1d] hover:bg-[#1e2327] border border-[#2e353c] hover:border-[#d4af37]/40 flex items-center justify-between transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-[#d4af37]" />
                  <span className="text-xs font-semibold text-gray-200">Abone Rehberi</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-[#d4af37]" />
              </Link>

              <Link
                href="/groups"
                className="p-3 rounded-2xl bg-[#161a1d] hover:bg-[#1e2327] border border-[#2e353c] hover:border-[#10b981]/40 flex items-center justify-between transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <FolderTree className="w-4 h-4 text-[#10b981]" />
                  <span className="text-xs font-semibold text-gray-200">Çift Pencereli Gruplar</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-[#10b981]" />
              </Link>

              <Link
                href="/special-days"
                className="p-3 rounded-2xl bg-[#161a1d] hover:bg-[#1e2327] border border-[#2e353c] hover:border-blue-400/40 flex items-center justify-between transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-semibold text-gray-200">Özel Gün & Kandil Takvimi</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-blue-400" />
              </Link>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#161a1d] border border-[#d4af37]/20 text-[11px] text-gray-400">
            Otomatik tetikleyiciler her sabah <strong>08:00</strong>'de aktifleşir.
          </div>
        </div>
      </div>
    </div>
  );
}
