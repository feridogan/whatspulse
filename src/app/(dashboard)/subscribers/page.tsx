"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Users, 
  Plus, 
  Search, 
  RefreshCw, 
  FileUp, 
  MessageSquare, 
  Trash2, 
  Edit3, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Globe, 
  Tag, 
  X, 
  Send,
  PhoneCall,
  Mail,
  Smartphone,
  Sparkles
} from "lucide-react";

export default function SubscribersPage() {
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL"); // ALL, INTERACTIVE, ACTIVE, BLACKLIST
  const [selectedGroup, setSelectedGroup] = useState("ALL");
  const [total, setTotal] = useState(0);

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingSub, setEditingSub] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showVcfModal, setShowVcfModal] = useState(false);
  const [vcfText, setVcfText] = useState("");
  const [vcfLoading, setVcfLoading] = useState(false);

  // Instant message modal
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [msgTarget, setMsgTarget] = useState<any>(null);
  const [msgContent, setMsgContent] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    company: "",
    notes: "",
    channels: ["WhatsApp"],
    preferredTime: "08:00",
    language: "TR",
    groupIds: [] as string[],
    isActive: true,
    isInteractive: false,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [subRes, grpRes] = await Promise.all([
        fetch(`/api/subscribers?search=${encodeURIComponent(search)}&filter=${filter}&groupId=${selectedGroup}&limit=100`),
        fetch("/api/groups")
      ]);
      const subData = await subRes.json();
      const grpData = await grpRes.json();
      if (subData.success) {
        setSubscribers(subData.subscribers || []);
        setTotal(subData.total || 0);
      }
      if (Array.isArray(grpData)) setGroups(grpData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filter, selectedGroup]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleOpenNewModal = () => {
    setEditingSub(null);
    setFormData({
      name: "",
      phone: "+90",
      email: "",
      company: "",
      notes: "",
      channels: ["WhatsApp"],
      preferredTime: "08:00",
      language: "TR",
      groupIds: groups.length > 0 ? [groups[0].id] : [],
      isActive: true,
      isInteractive: false,
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (sub: any) => {
    setEditingSub(sub);
    setFormData({
      name: sub.name,
      phone: sub.phone,
      email: sub.email || "",
      company: sub.company || "",
      notes: sub.notes || "",
      channels: Array.isArray(sub.channels) ? sub.channels : ["WhatsApp"],
      preferredTime: sub.preferredTime || "08:00",
      language: sub.language || "TR",
      groupIds: sub.groups ? sub.groups.map((g: any) => g.groupId) : [],
      isActive: sub.isActive !== undefined ? sub.isActive : true,
      isInteractive: sub.isInteractive || false,
    });
    setShowModal(true);
  };

  const handleSaveSubscriber = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/subscribers", {
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

  const handleSyncContacts = async () => {
    if (!confirm("Kişiler rehberindeki kayıtlar abone veritabanına eşitlenecektir. Onaylıyor musunuz?")) return;
    setSyncing(true);
    try {
      const res = await fetch("/api/subscribers/sync", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        loadData();
      } else {
        alert(data.error || "Eşitleme başarısız.");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteSubscriber = async (id: string, name: string) => {
    if (!confirm(`"${name}" abonesini silmek istediğinize emin misiniz?`)) return;
    try {
      const res = await fetch(`/api/subscribers/${id}`, { method: "DELETE" });
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

  const handleOpenSendMessage = (sub: any) => {
    setMsgTarget(sub);
    setMsgContent(`Sayın ${sub.name}, `);
    setShowMessageModal(true);
  };

  const handleSendDirectMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgTarget || !msgContent.trim()) return;

    setSendingMsg(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: msgTarget.phone,
          content: msgContent
        })
      });
      const data = await res.json();
      if (data.success) {
        alert("Mesaj başarıyla WhatsApp üzerinden iletildi!");
        setShowMessageModal(false);
        setMsgContent("");
      } else {
        alert(data.error || "Mesaj iletilemedi.");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSendingMsg(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-[#111b21] border border-gray-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-bold border border-emerald-500/30">
              Müşteri & Abone CRM
            </span>
            <span className="text-xs text-gray-400 font-mono font-bold">
              ({total} Abone Kayıtlı)
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-1">Aboneler & Müşteri Yönetimi</h1>
          <p className="text-xs text-gray-400">
            Bildirim kanalları (WhatsApp, SMS, E-Posta, Ses), grup segmentasyonu ve etkileşim durumları.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleOpenNewModal}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-black" />
            <span>+ Yeni Abone Ekle</span>
          </button>

          <button
            onClick={handleSyncContacts}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#202c33] hover:bg-[#2a3942] text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
            <span>{syncing ? "Eşitleniyor..." : "Rehberi Eşitle"}</span>
          </button>
        </div>
      </div>

      {/* Toolbar & Filter Bar */}
      <div className="p-4 rounded-2xl bg-[#111b21] border border-gray-800 flex flex-col lg:flex-row items-center justify-between gap-3 shadow-md">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full lg:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="İsim, telefon, e-posta veya firma ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#202c33] border border-gray-700 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
          />
        </form>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Group Dropdown */}
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="bg-[#202c33] border border-gray-700 text-xs text-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="ALL">Tüm Gruplar</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>

          {/* Type filters */}
          {[
            { key: "ALL", label: "Tüm Aboneler" },
            { key: "INTERACTIVE", label: "Etkileşimli" },
            { key: "ACTIVE", label: "Aktifler" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filter === f.key
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "bg-[#202c33] text-gray-400 hover:text-white border border-gray-800"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Subscribers Table */}
      <div className="bg-[#111b21] border border-gray-800 rounded-3xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-gray-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-400" />
            <p className="text-xs">Aboneler listeleniyor...</p>
          </div>
        ) : subscribers.length === 0 ? (
          <div className="p-12 text-center text-gray-500 space-y-3">
            <Users className="w-12 h-12 mx-auto opacity-30 text-amber-400" />
            <h3 className="text-sm font-bold text-gray-300">Abone Bulunamadı</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              "Yeni Abone Ekle" veya "Rehberi Eşitle" butonlarını kullanarak müşterilerinizi sisteme dahil edebilirsiniz.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-[#16222b] text-[11px] uppercase tracking-wider text-gray-400 border-b border-gray-800 font-mono">
                <tr>
                  <th className="py-3 px-4">Abone (İsim & Telefon)</th>
                  <th className="py-3 px-4">Grup & Kayıt</th>
                  <th className="py-3 px-4">Gönderim Tercihleri</th>
                  <th className="py-3 px-4">Dil / Saat</th>
                  <th className="py-3 px-4">Durum & Etkileşim</th>
                  <th className="py-3 px-4">Domainler</th>
                  <th className="py-3 px-4 text-right">Aksiyonlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 font-sans">
                {subscribers.map((sub) => {
                  const channelList = Array.isArray(sub.channels) ? sub.channels : ["WhatsApp"];
                  return (
                    <tr key={sub.id} className="hover:bg-[#16222b]/50 transition-colors">
                      {/* Name & Phone */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500/20 to-emerald-500/20 border border-amber-500/30 flex items-center justify-center text-xs font-bold text-amber-300 font-mono">
                            {sub.name ? sub.name.slice(0, 2).toUpperCase() : "AB"}
                          </div>
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{sub.name}</span>
                              {sub.company && (
                                <span className="text-[10px] text-gray-400 font-normal">({sub.company})</span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-400 font-mono flex items-center gap-1">
                              <span>{sub.phone}</span>
                              {sub.email && (
                                <span className="text-gray-500 truncate max-w-[120px]">• {sub.email}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Group Badges */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {sub.groups && sub.groups.length > 0 ? (
                            sub.groups.map((g: any) => (
                              <span
                                key={g.groupId}
                                className="px-2 py-0.5 rounded-md bg-[#202c33] text-gray-300 border border-gray-700 text-[10px] font-semibold"
                              >
                                {g.group?.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-gray-500 italic">Genel Rehber</span>
                          )}
                        </div>
                      </td>

                      {/* Notification Channels */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {channelList.includes("WhatsApp") && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                              <Smartphone className="w-2.5 h-2.5" /> WhatsApp
                            </span>
                          )}
                          {channelList.includes("SMS") && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 text-[10px] font-bold">
                              SMS
                            </span>
                          )}
                          {channelList.includes("E-Posta") && (
                            <span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30 text-[10px] font-bold flex items-center gap-1">
                              <Mail className="w-2.5 h-2.5" /> E-Posta
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Language / Preferred Time */}
                      <td className="py-3 px-4 font-mono text-[11px] text-gray-300">
                        <span className="px-2 py-0.5 rounded bg-[#202c33] text-gray-300 border border-gray-700">
                          {sub.language || "TR"} {sub.preferredTime || "08:00"}
                        </span>
                      </td>

                      {/* Status & Interactive Badge */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                            Aktif
                          </span>
                          {sub.isInteractive && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                              Etkileşimli
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Domain count */}
                      <td className="py-3 px-4 font-mono text-[11px] text-gray-400">
                        {sub.domains && sub.domains.length > 0 ? (
                          <span className="text-amber-400 font-bold">{sub.domains.length} Domain</span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Direct Message */}
                          <button
                            onClick={() => handleOpenSendMessage(sub)}
                            className="p-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 transition-all cursor-pointer"
                            title="Hızlı WhatsApp Mesajı Gönder"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleOpenEditModal(sub)}
                            className="p-1.5 rounded-xl bg-[#202c33] hover:bg-[#2a3942] text-gray-300 border border-gray-700 transition-all cursor-pointer"
                            title="Düzenle"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteSubscriber(sub.id, sub.name)}
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

      {/* Subscriber Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#111b21] border border-gray-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">
                  {editingSub ? "Aboneyi Düzenle" : "Yeni Abone / Müşteri Ekle"}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubscriber} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Müşteri / Abone Adı *</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Ahmet Yılmaz"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Telefon Numarası *</label>
                  <input
                    type="text"
                    required
                    placeholder="+905xxxxxxxxx"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Firma / Kurum</label>
                  <input
                    type="text"
                    placeholder="Örn: Çakırlar Ltd."
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">E-Posta Adresi</label>
                <input
                  type="email"
                  placeholder="ahmet@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              {/* Group Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Dahil Edilecek Gruplar</label>
                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-2 bg-[#202c33] rounded-xl border border-gray-700">
                  {groups.map((g) => {
                    const isChecked = formData.groupIds.includes(g.id);
                    return (
                      <label key={g.id} className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setFormData({ ...formData, groupIds: formData.groupIds.filter(id => id !== g.id) });
                            } else {
                              setFormData({ ...formData, groupIds: [...formData.groupIds, g.id] });
                            }
                          }}
                          className="w-3.5 h-3.5 accent-amber-500"
                        />
                        <span>{g.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Preferences */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Tercih Edilen Saat</label>
                  <input
                    type="time"
                    value={formData.preferredTime}
                    onChange={(e) => setFormData({ ...formData, preferredTime: e.target.value })}
                    className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Bildirim Dili</label>
                  <select
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="TR">Türkçe (TR)</option>
                    <option value="EN">English (EN)</option>
                  </select>
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
                  {saving ? "Kaydediliyor..." : "Aboneyi Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Instant Direct WhatsApp Message Modal */}
      {showMessageModal && msgTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#111b21] border border-gray-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2 text-emerald-400">
                <MessageSquare className="w-5 h-5" />
                <h3 className="text-sm font-bold text-white">Anlık WhatsApp Mesajı Gönder</h3>
              </div>
              <button onClick={() => setShowMessageModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[#202c33] border border-gray-700 text-xs text-gray-300 space-y-1">
              <div>Alıcı: <strong className="text-white">{msgTarget.name}</strong></div>
              <div className="font-mono text-emerald-400">{msgTarget.phone}</div>
            </div>

            <form onSubmit={handleSendDirectMessage} className="space-y-3">
              <textarea
                rows={4}
                required
                value={msgContent}
                onChange={(e) => setMsgContent(e.target.value)}
                placeholder="Mesajınızı buraya yazın..."
                className="w-full bg-[#202c33] border border-gray-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMessageModal(false)}
                  className="px-4 py-2 rounded-xl bg-gray-800 text-xs font-semibold text-gray-300"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={sendingMsg}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendingMsg ? "Gönderiliyor..." : "WhatsApptan Gönder"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
