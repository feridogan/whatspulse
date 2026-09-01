"use client";

import React, { useState, useEffect } from "react";
import { 
  BarChart3, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  RefreshCw, 
  Calendar, 
  Download,
  Smartphone,
  Mail,
  PhoneCall,
  Clock
} from "lucide-react";

export default function ReportsPage() {
  const [stats, setStats] = useState<any>({
    totalMessages: 0,
    sentMessages: 0,
    failedMessages: 0,
    successRate: "100.0"
  });
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const loadReports = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/reports");
      const data = await res.json();
      if (data.success) {
        if (data.stats) setStats(data.stats);
        if (data.recentLogs) setLogs(data.recentLogs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const filteredLogs = logs.filter(l => {
    const matchSearch = l.phone.includes(search) || 
      (l.content && l.content.toLowerCase().includes(search.toLowerCase())) ||
      (l.contact?.name && l.contact.name.toLowerCase().includes(search.toLowerCase()));

    if (!matchSearch) return false;
    if (statusFilter === "ALL") return true;
    return l.status === statusFilter;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-[#111b21] border border-gray-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-teal-500/15 text-teal-300 text-xs font-bold border border-teal-500/30">
              Analitik & İletim Raporları
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-1">İletim & Bildirim Logları</h1>
          <p className="text-xs text-gray-400">
            Domain yenileme uyarılarının, WhatsApp mesajlarının ve kampanya bildirimlerinin anlık durum raporu.
          </p>
        </div>

        <button
          onClick={loadReports}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#202c33] hover:bg-[#2a3942] text-teal-300 border border-teal-500/30 text-xs font-bold transition-all cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Raporu Yenile</span>
        </button>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-[#111b21] border border-gray-800 shadow-lg">
          <span className="text-xs font-bold text-gray-400">Toplam Bildirim</span>
          <div className="text-2xl font-black text-white font-mono mt-1">{stats.totalMessages}</div>
          <p className="text-[11px] text-gray-500 mt-0.5">Sistem geneli tüm gönderimler</p>
        </div>

        <div className="p-5 rounded-3xl bg-[#111b21] border border-gray-800 shadow-lg">
          <span className="text-xs font-bold text-gray-400">Başarıyla İletilen</span>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-1">{stats.sentMessages}</div>
          <p className="text-[11px] text-emerald-400/80 mt-0.5">Teslim edildi / Okundu</p>
        </div>

        <div className="p-5 rounded-3xl bg-[#111b21] border border-gray-800 shadow-lg">
          <span className="text-xs font-bold text-gray-400">Hatalı / Ulaşmayan</span>
          <div className="text-2xl font-black text-rose-400 font-mono mt-1">{stats.failedMessages}</div>
          <p className="text-[11px] text-rose-400/80 mt-0.5">Numara geçersiz / Hat kopuk</p>
        </div>

        <div className="p-5 rounded-3xl bg-[#111b21] border border-gray-800 shadow-lg">
          <span className="text-xs font-bold text-gray-400">Teslimat Başarı Oranı</span>
          <div className="text-2xl font-black text-amber-400 font-mono mt-1">%{stats.successRate}</div>
          <p className="text-[11px] text-amber-400/80 mt-0.5">Genel SLA kalitesi</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-[#111b21] border border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Numara veya mesaj içeriği ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#202c33] border border-gray-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {[
            { key: "ALL", label: "Tüm Durumlar" },
            { key: "SENT", label: "İletilenler" },
            { key: "DELIVERED", label: "Teslim Edilenler" },
            { key: "FAILED", label: "Hatalılar" }
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                statusFilter === f.key
                  ? "bg-teal-500/20 text-teal-300 border border-teal-500/40"
                  : "bg-[#202c33] text-gray-400 hover:text-white border border-gray-800"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-[#111b21] border border-gray-800 rounded-3xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-gray-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-400" />
            <p className="text-xs">Rapor logları yükleniyor...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-gray-500 space-y-3">
            <BarChart3 className="w-12 h-12 mx-auto opacity-30 text-teal-400" />
            <h3 className="text-sm font-bold text-gray-300">Kayıt Bulunamadı</h3>
            <p className="text-xs text-gray-500">Arama kriterinize uygun gönderim kaydı bulunamadı.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-[#16222b] text-[11px] uppercase tracking-wider text-gray-400 border-b border-gray-800 font-mono">
                <tr>
                  <th className="py-3 px-4">Alıcı Telefon / İsim</th>
                  <th className="py-3 px-4">Mesaj İçeriği</th>
                  <th className="py-3 px-4">Kampanya / Tür</th>
                  <th className="py-3 px-4">Tarih / Saat</th>
                  <th className="py-3 px-4 text-right">İletim Durumu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 font-sans">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#16222b]/50 transition-colors">
                    {/* Recipient */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-white font-mono">{log.phone}</div>
                      {log.contact?.name && (
                        <div className="text-[10px] text-gray-400">{log.contact.name}</div>
                      )}
                    </td>

                    {/* Content */}
                    <td className="py-3 px-4 max-w-md">
                      <div className="text-xs text-gray-200 truncate">{log.content}</div>
                      {log.errorMessage && (
                        <div className="text-[10px] text-rose-400 mt-0.5">{log.errorMessage}</div>
                      )}
                    </td>

                    {/* Type */}
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-[#202c33] text-gray-300 border border-gray-700 text-[10px] font-semibold">
                        {log.campaign?.title || "Bireysel WhatsApp"}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4 font-mono text-[11px] text-gray-400">
                      {new Date(log.createdAt).toLocaleString("tr-TR")}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-right">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${
                        log.status === "SENT" || log.status === "DELIVERED" || log.status === "READ"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : log.status === "FAILED"
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      }`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
