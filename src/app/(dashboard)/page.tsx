"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Users, 
  UserCheck, 
  Send, 
  AlertTriangle, 
  TrendingUp, 
  Wifi, 
  WifiOff, 
  ShieldCheck, 
  Globe, 
  Clock, 
  CheckCircle2, 
  Plus, 
  ArrowRight, 
  RefreshCw, 
  Receipt, 
  MessageSquare,
  Sparkles,
  ExternalLink,
  Layers
} from "lucide-react";

export default function DashboardPage() {
  const [stats, setStats] = useState<any>({
    totalSubscribers: 0,
    activeSubscribers: 0,
    interactiveSubscribers: 0,
    totalDelivered: 0,
    totalFailed: 0,
    successRate: 99.8,
    whatsappConnected: false,
    whatsappState: "KOPUK",
    spamRisk: "DÜŞÜK (GÜVENLİ)",
    totalDomains: 0,
    expiringCount: 0,
  });
  const [expiringDomains, setExpiringDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/dashboard/stats");
      const data = await res.json();
      if (data.success) {
        if (data.stats) setStats(data.stats);
        if (data.expiringDomains) setExpiringDomains(data.expiringDomains);
      }
    } catch (err) {
      console.error("Dashboard stats error:", err);
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
      {/* Top Banner: DTS Status & Quick Summary */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#121c24] via-[#0f1a20] to-[#0c1418] border border-amber-500/20 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[11px] font-extrabold border border-amber-500/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              DTS Enterprise Panel
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[11px] font-bold border border-emerald-500/30">
              Canlı Takip Aktif
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Domain Takip & İletişim Kontrol Merkezi
          </h1>
          <p className="text-xs text-gray-400 max-w-2xl">
            Alan adı süre bitişlerini, WhatsApp bildirimlerini, müşteri etkileşimlerini ve sipariş tekliflerini tek merkezden yönetin.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/domains"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-black" />
            <span>+ Yeni Alan Adı</span>
          </Link>
          <Link
            href="/subscribers"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#202c33] hover:bg-[#2a3942] text-gray-200 border border-gray-700 text-xs font-bold transition-all cursor-pointer"
          >
            <Users className="w-4 h-4 text-amber-400" />
            <span>+ Yeni Abone</span>
          </Link>
          <button
            onClick={fetchStats}
            title="İstatistikleri Yenile"
            className="p-2.5 rounded-xl bg-[#16222b] hover:bg-[#202c33] text-gray-300 border border-gray-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* 7 Statistics Cards (Dark Gold / Emerald Theme) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Toplam Abone / Müşteri */}
        <div className="p-5 rounded-3xl bg-[#111b21] border border-gray-800 hover:border-amber-500/30 transition-all shadow-lg group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400">Toplam Abone / Müşteri</span>
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white tracking-tight font-mono">
              {stats.totalSubscribers.toLocaleString("tr-TR")}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                {stats.activeSubscribers} Aktif Abone
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Etkileşimli Abone */}
        <div className="p-5 rounded-3xl bg-[#111b21] border border-gray-800 hover:border-emerald-500/30 transition-all shadow-lg group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400">Etkileşimli Abone</span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white tracking-tight font-mono">
              {stats.interactiveSubscribers.toLocaleString("tr-TR")}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">WhatsApp onaylı / yanıt veren</p>
          </div>
        </div>

        {/* Card 3: İletilen Bildirimler */}
        <div className="p-5 rounded-3xl bg-[#111b21] border border-gray-800 hover:border-teal-500/30 transition-all shadow-lg group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400">İletilen Bildirimler</span>
            <div className="w-9 h-9 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 group-hover:scale-110 transition-transform">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white tracking-tight font-mono">
              {stats.totalDelivered.toLocaleString("tr-TR")}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Teslim edilen mesaj & bildirim</span>
            </div>
          </div>
        </div>

        {/* Card 4: Başarısız Mesaj & Başarı Oranı */}
        <div className="p-5 rounded-3xl bg-[#111b21] border border-gray-800 hover:border-rose-500/30 transition-all shadow-lg group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400">Başarı Oranı</span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white tracking-tight font-mono">
              %{stats.successRate}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-gray-400">
              <span>Hata: <strong className="text-rose-400">{stats.totalFailed}</strong> mesaj</span>
            </div>
          </div>
        </div>
      </div>

      {/* Second Row: WhatsApp Line Status, Spam Risk & Domain Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* WhatsApp Line Status */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-[#111b21] to-[#0c161c] border border-emerald-500/20 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-400">WhatsApp Hattı Durumu</span>
            <div className="flex items-center gap-2 mt-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${stats.whatsappConnected ? "bg-emerald-400 animate-pulse" : "bg-rose-500"}`} />
              <span className={`text-sm font-extrabold uppercase font-mono ${stats.whatsappConnected ? "text-emerald-400" : "text-rose-400"}`}>
                {stats.whatsappState}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">Evolution API v2 soketi</p>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
            stats.whatsappConnected 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
              : "bg-rose-500/10 border-rose-500/30 text-rose-400"
          }`}>
            {stats.whatsappConnected ? <Wifi className="w-6 h-6" /> : <WifiOff className="w-6 h-6" />}
          </div>
        </div>

        {/* Spam & Line Risk */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-[#111b21] to-[#0c161c] border border-amber-500/20 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-400">Spam & Hat Riski</span>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-sm font-extrabold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-mono">
                {stats.spamRisk}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">İnsansı gecikme (5-15 sn) devrede</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Domain Radar Metric */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-[#111b21] to-[#0c161c] border border-gray-800 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-400">Kayıtlı Alan Adları</span>
            <div className="text-xl font-black text-white font-mono mt-1">
              {stats.totalDomains} Domain
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-amber-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{stats.expiringCount} alan adı yenileme bekliyor</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#16222b] border border-gray-700 flex items-center justify-center text-amber-400">
            <Globe className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Domain Expiry Radar & Quick Notifications Section */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[#111b21] border border-gray-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Yaklaşan Alan Adı Yenilemeleri (Domain Radarı)</h2>
              <p className="text-[11px] text-gray-400">Bitiş tarihi yaklaşan alan adları için tek tıkla WhatsApp hatırlatması gönderin.</p>
            </div>
          </div>

          <Link
            href="/domains"
            className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
          >
            <span>Tüm Alan Adları</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {expiringDomains.length === 0 ? (
          <div className="p-8 text-center text-gray-500 space-y-2">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400/50" />
            <p className="text-xs font-semibold text-gray-300">Önümüzdeki 30 gün içinde süresi dolacak kritik alan adı bulunmuyor.</p>
            <p className="text-[11px] text-gray-500">Yeni alan adları tanımlamak için "Alan Adları & Hosting" menüsünü kullanabilirsiniz.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-800 font-mono">
                <tr>
                  <th className="py-2.5 px-3">Alan Adı</th>
                  <th className="py-2.5 px-3">Müşteri / Abone</th>
                  <th className="py-2.5 px-3">Kayıt Firması</th>
                  <th className="py-2.5 px-3">Bitiş Tarihi</th>
                  <th className="py-2.5 px-3">Kalan Süre</th>
                  <th className="py-2.5 px-3 text-right">Hızlı İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 font-sans">
                {expiringDomains.map((dom) => {
                  const expiry = new Date(dom.expiryDate);
                  const diffDays = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  const isUrgent = diffDays <= 7;
                  const isWarning = diffDays <= 15;

                  return (
                    <tr key={dom.id} className="hover:bg-[#16222b]/50 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-white flex items-center gap-1.5">
                        <span>{dom.name}</span>
                        <a
                          href={`https://${dom.name}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-gray-500 hover:text-amber-400"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                      <td className="py-3 px-3">
                        {dom.subscriber ? (
                          <div>
                            <div className="font-semibold text-white">{dom.subscriber.name}</div>
                            <div className="text-[10px] text-gray-400 font-mono">{dom.subscriber.phone}</div>
                          </div>
                        ) : (
                          <span className="text-gray-500 italic">Abone Atanmamış</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-gray-400">
                        {dom.registrar || "METUNIC"}
                      </td>
                      <td className="py-3 px-3 font-mono text-gray-300">
                        {expiry.toLocaleDateString("tr-TR")}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold font-mono border ${
                          isUrgent
                            ? "bg-rose-500/20 text-rose-400 border-rose-500/30 animate-pulse"
                            : isWarning
                            ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                            : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        }`}>
                          {diffDays <= 0 ? "SÜRESİ BİTTİ" : `${diffDays} Gün Kaldı`}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          href={`/chat?phone=${dom.subscriber?.phone || ""}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold transition-all cursor-pointer"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>WhatsApp Hatırlat</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Access Modules Navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/domains"
          className="p-5 rounded-3xl bg-[#111b21] border border-gray-800 hover:border-amber-500/40 transition-all flex items-center justify-between group cursor-pointer shadow-lg"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">Alan Adları & Hosting</h3>
              <p className="text-[11px] text-gray-400">WHOIS sorgulama ve SSL takibi</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-amber-400 transition-colors" />
        </Link>

        <Link
          href="/groups"
          className="p-5 rounded-3xl bg-[#111b21] border border-gray-800 hover:border-emerald-500/40 transition-all flex items-center justify-between group cursor-pointer shadow-lg"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">Çift Pencereli Gruplar</h3>
              <p className="text-[11px] text-gray-400">Hızlı müşteri & abone ataması</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-emerald-400 transition-colors" />
        </Link>

        <Link
          href="/orders"
          className="p-5 rounded-3xl bg-[#111b21] border border-gray-800 hover:border-teal-500/40 transition-all flex items-center justify-between group cursor-pointer shadow-lg"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 group-hover:scale-110 transition-transform">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">Sipariş & Teklifler</h3>
              <p className="text-[11px] text-gray-400">Yenileme teklifi ve PDF çıktısı</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-teal-400 transition-colors" />
        </Link>
      </div>
    </div>
  );
}
