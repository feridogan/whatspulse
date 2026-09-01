"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Globe, 
  Plus, 
  Search, 
  ExternalLink, 
  ShieldCheck, 
  Clock, 
  Trash2, 
  Edit3, 
  MessageSquare, 
  Receipt, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw,
  Calendar,
  X,
  Lock,
  Tag
} from "lucide-react";

export default function DomainsPage() {
  const [domains, setDomains] = useState<any[]>([]);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showModal, setShowModal] = useState(false);
  const [editingDomain, setEditingDomain] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    subscriberId: "",
    registrar: "METUNIC",
    expiryDate: "",
    sslExpiryDate: "",
    autoRenew: false,
    price: 250,
    currency: "TL",
    notes: ""
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [domRes, subRes] = await Promise.all([
        fetch(`/api/domains?search=${encodeURIComponent(search)}&status=${statusFilter}`),
        fetch("/api/subscribers?limit=200")
      ]);
      const domData = await domRes.json();
      const subData = await subRes.json();
      if (domData.success) setDomains(domData.domains || []);
      if (subData.success) setSubscribers(subData.subscribers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleOpenNewModal = () => {
    setEditingDomain(null);
    const oneYearLater = new Date();
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
    setFormData({
      name: "",
      subscriberId: subscribers[0]?.id || "",
      registrar: "METUNIC",
      expiryDate: oneYearLater.toISOString().split("T")[0],
      sslExpiryDate: oneYearLater.toISOString().split("T")[0],
      autoRenew: false,
      price: 250,
      currency: "TL",
      notes: ""
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (dom: any) => {
    setEditingDomain(dom);
    setFormData({
      name: dom.name,
      subscriberId: dom.subscriberId || "",
      registrar: dom.registrar || "METUNIC",
      expiryDate: dom.expiryDate ? new Date(dom.expiryDate).toISOString().split("T")[0] : "",
      sslExpiryDate: dom.sslExpiryDate ? new Date(dom.sslExpiryDate).toISOString().split("T")[0] : "",
      autoRenew: dom.autoRenew || false,
      price: dom.price || 250,
      currency: dom.currency || "TL",
      notes: dom.notes || ""
    });
    setShowModal(true);
  };

  const handleSaveDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        loadData();
      } else {
        alert(data.error || "Hata oluştu.");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDomain = async (id: string, name: string) => {
    if (!confirm(`"${name}" alan adını silmek istediğinize emin misiniz?`)) return;
    try {
      const res = await fetch(`/api/domains/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        loadData();
      } else {
        alert(data.error || "Silinemedi.");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-[#111b21] border border-gray-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-xs font-bold border border-amber-500/30">
              WHOIS & DNS Radar
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-1">Alan Adları & Hosting Takibi</h1>
          <p className="text-xs text-gray-400">
            Kayıtlı alan adlarının bitiş tarihlerini, SSL sertifikalarını ve yenileme fiyatlarını takip edin.
          </p>
        </div>

        <button
          onClick={handleOpenNewModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-black" />
          <span>+ Yeni Alan Adı Ekle</span>
        </button>
      </div>

      {/* Toolbar & Filters */}
      <div className="p-4 rounded-2xl bg-[#111b21] border border-gray-800 flex flex-col md:flex-row items-center justify-between gap-3 shadow-md">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Alan adı, müşteri veya kayıt firması ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#202c33] border border-gray-700 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {[
            { key: "ALL", label: "Tüm Alan Adları" },
            { key: "ACTIVE", label: "Aktifler" },
            { key: "EXPIRING_SOON", label: "Süresi Yaklaşanlar" },
            { key: "EXPIRED", label: "Süresi Dolanlar" }
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                statusFilter === f.key
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "bg-[#202c33] text-gray-400 hover:text-white border border-gray-800"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Domains Table */}
      <div className="bg-[#111b21] border border-gray-800 rounded-3xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-gray-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-400" />
            <p className="text-xs">Alan adları yükleniyor...</p>
          </div>
        ) : domains.length === 0 ? (
          <div className="p-12 text-center text-gray-500 space-y-3">
            <Globe className="w-12 h-12 mx-auto opacity-30 text-amber-400" />
            <h3 className="text-sm font-bold text-gray-300">Henüz Alan Adı Eklenmedi</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Yukarıdaki "+ Yeni Alan Adı Ekle" butonuna basarak ilk domain kaydını oluşturabilirsiniz.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-[#16222b] text-[11px] uppercase tracking-wider text-gray-400 border-b border-gray-800 font-mono">
                <tr>
                  <th className="py-3 px-4">Alan Adı</th>
                  <th className="py-3 px-4">Abone / Müşteri</th>
                  <th className="py-3 px-4">Kayıt Firması</th>
                  <th className="py-3 px-4">Bitiş Tarihi</th>
                  <th className="py-3 px-4">Kalan Süre</th>
                  <th className="py-3 px-4">Yenileme Bedeli</th>
                  <th className="py-3 px-4 text-right">Aksiyonlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 font-sans">
                {domains.map((dom) => {
                  const expiry = new Date(dom.expiryDate);
                  const diffDays = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  const isUrgent = diffDays <= 7;
                  const isWarning = diffDays <= 30;

                  return (
                    <tr key={dom.id} className="hover:bg-[#16222b]/50 transition-colors">
                      {/* Domain Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-mono font-bold">
                            <Globe className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-mono font-bold text-white flex items-center gap-1.5">
                              <span>{dom.name}</span>
                              <a
                                href={`https://${dom.name}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-gray-500 hover:text-amber-400"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                              <Lock className="w-2.5 h-2.5 text-emerald-400" />
                              <span>SSL: Aktif</span>
                              {dom.autoRenew && (
                                <span className="text-amber-400 font-bold">• Oto-Yenileme</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Subscriber */}
                      <td className="py-3.5 px-4">
                        {dom.subscriber ? (
                          <div>
                            <div className="font-semibold text-white">{dom.subscriber.name}</div>
                            <div className="text-[11px] text-gray-400 font-mono">{dom.subscriber.phone}</div>
                          </div>
                        ) : (
                          <span className="text-gray-500 italic">Abone Atanmamış</span>
                        )}
                      </td>

                      {/* Registrar */}
                      <td className="py-3.5 px-4 font-mono font-semibold text-gray-300">
                        <span className="px-2 py-0.5 rounded-lg bg-[#202c33] border border-gray-700 text-[11px]">
                          {dom.registrar || "METUNIC"}
                        </span>
                      </td>

                      {/* Expiry Date */}
                      <td className="py-3.5 px-4 font-mono text-gray-300">
                        {expiry.toLocaleDateString("tr-TR")}
                      </td>

                      {/* Remaining Days Badge */}
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold font-mono border ${
                          isUrgent
                            ? "bg-rose-500/20 text-rose-400 border-rose-500/30 animate-pulse"
                            : isWarning
                            ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                            : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        }`}>
                          {diffDays <= 0 ? "SÜRESİ BİTTİ" : `${diffDays} Gün Kaldı`}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-300">
                        {dom.price || 250} {dom.currency || "TL"} / Yıl
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* WhatsApp Reminder */}
                          <Link
                            href={`/chat?phone=${dom.subscriber?.phone || ""}&message=${encodeURIComponent(`Sayın ${dom.subscriber?.name || "Müşterimiz"}, ${dom.name} alan adınızın yenileme tarihi yaklaşmaktadır.`)}`}
                            className="p-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 transition-all cursor-pointer"
                            title="WhatsApp Yenileme Hatırlatması Gönder"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </Link>

                          {/* Edit */}
                          <button
                            onClick={() => handleOpenEditModal(dom)}
                            className="p-1.5 rounded-xl bg-[#202c33] hover:bg-[#2a3942] text-gray-300 border border-gray-700 transition-all cursor-pointer"
                            title="Düzenle"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteDomain(dom.id, dom.name)}
                            className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all cursor-pointer"
                            title="Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Domain Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#111b21] border border-gray-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">
                  {editingDomain ? "Alan Adını Düzenle" : "Yeni Alan Adı Tanımla"}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDomain} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Alan Adı (Domain) *</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: cakirlar.net"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Abone / Müşteri</label>
                  <select
                    value={formData.subscriberId}
                    onChange={(e) => setFormData({ ...formData, subscriberId: e.target.value })}
                    className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">(Seçilmedi)</option>
                    {subscribers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.phone})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Kayıt Firması</label>
                  <input
                    type="text"
                    placeholder="METUNIC, Natro, IHS vb."
                    value={formData.registrar}
                    onChange={(e) => setFormData({ ...formData, registrar: e.target.value })}
                    className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Bitiş Tarihi *</label>
                  <input
                    type="date"
                    required
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">SSL Bitiş Tarihi</label>
                  <input
                    type="date"
                    value={formData.sslExpiryDate}
                    onChange={(e) => setFormData({ ...formData, sslExpiryDate: e.target.value })}
                    className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Yenileme Fiyatı (TL)</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.autoRenew}
                      onChange={(e) => setFormData({ ...formData, autoRenew: e.target.checked })}
                      className="w-4 h-4 accent-amber-500"
                    />
                    <span>Otomatik Yenilensin</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-300"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-black shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  {saving ? "Kaydediliyor..." : "Alan Adını Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
