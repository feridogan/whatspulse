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
  Sparkles,
  BookOpen,
  FolderTree,
  SlidersHorizontal,
  Phone,
  Mail,
  Info
} from "lucide-react";

export default function SubscribersPage() {
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSubscriber, setFilterSubscriber] = useState("ALL"); // ALL, ACTIVE, INACTIVE
  const [filterInteraction, setFilterInteraction] = useState("ALL"); // ALL, INTERACTIVE
  const [filterMethod, setFilterMethod] = useState("ALL"); // ALL, AYET, HADIS, ALIM, TARIH
  const [selectedGroup, setSelectedGroup] = useState("ALL");
  const [total, setTotal] = useState(0);

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingSub, setEditingSub] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showVcfModal, setShowVcfModal] = useState(false);
  const [vcfLoading, setVcfLoading] = useState(false);
  const [vcfFile, setVcfFile] = useState<File | null>(null);

  // Direct Message Modal
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
    categories: ["Ayet", "Hadis", "Alim", "Tarih"],
    contentDetails: "Arapça + Meal + Tefsir",
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
        fetch(`/api/subscribers?search=${encodeURIComponent(search)}&filter=${filterInteraction === 'INTERACTIVE' ? 'INTERACTIVE' : 'ALL'}&groupId=${selectedGroup}&limit=100`),
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
  }, [filterSubscriber, filterInteraction, selectedGroup]);

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
      categories: ["Ayet", "Hadis", "Alim", "Tarih"],
      contentDetails: "Arapça + Meal + Tefsir",
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
      categories: ["Ayet", "Hadis", "Alim", "Tarih"],
      contentDetails: "Arapça + Meal + Tefsir",
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
        alert(data.error || "Kayıt sırasında hata oluştu.");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSyncContacts = async () => {
    if (!confirm("Rehberdeki tüm kişiler abone listesine eşitlenecektir. Devam edilsin mi?")) return;
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-[#121517] border border-[#23292e] shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#d4af37]/15 text-[#d4af37] text-xs font-bold border border-[#d4af37]/30 font-serif-title">
              ABONE & KİŞİ VERİTABANI
            </span>
            <span className="text-xs text-gray-400 font-mono font-bold">
              ({total} Kayıtlı Abone)
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-1 font-serif-title">
            Abone Yönetimi & Bildirim Tercihleri
          </h1>
          <p className="text-xs text-gray-400">
            Abonelerin gönderim kategorilerini (Ayet, Hadis, Alim, Tarih), dil/saat tercihlerini ve etkileşim durumlarını yönetin.
          </p>
        </div>

        {/* 3 Action Buttons (Section 4) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 1. Mavi: Rehberi Eşitle */}
          <button
            onClick={handleSyncContacts}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
            <span>{syncing ? "Eşitleniyor..." : "Rehberi Eşitle"}</span>
          </button>

          {/* 2. Koyu Yeşil: VCF Rehber Yükle */}
          <button
            onClick={() => setShowVcfModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#064e3b] hover:bg-[#065f46] text-emerald-300 border border-emerald-500/30 text-xs font-bold shadow-md transition-all cursor-pointer"
          >
            <FileUp className="w-3.5 h-3.5" />
            <span>VCF Rehber Yükle (.vcf)</span>
          </button>

          {/* 3. Açık Yeşil/Gold: + Yeni Abone Ekle */}
          <button
            onClick={handleOpenNewModal}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#10b981] hover:from-[#e5c158] hover:to-[#059669] text-black font-extrabold text-xs shadow-lg shadow-[#d4af37]/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-black" />
            <span>+ Yeni Abone Ekle</span>
          </button>
        </div>
      </div>

      {/* Top Filter Bar (Section 4) */}
      <div className="p-4 rounded-2xl bg-[#121517] border border-[#23292e] flex flex-col lg:flex-row items-center justify-between gap-3 shadow-md">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full lg:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="🔍 Numara veya isim ile ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#181c1f] border border-[#2e353c] rounded-xl pl-9 pr-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37]"
          />
        </form>

        {/* 4 Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* [Tüm Aboneler ▾] */}
          <select
            value={filterSubscriber}
            onChange={(e) => setFilterSubscriber(e.target.value)}
            className="bg-[#181c1f] border border-[#2e353c] text-xs text-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#d4af37] cursor-pointer"
          >
            <option value="ALL">Tüm Aboneler ▾</option>
            <option value="ACTIVE">Aktif Aboneler</option>
            <option value="INACTIVE">Pasif Aboneler</option>
          </select>

          {/* [Tüm Etkileşimler ▾] */}
          <select
            value={filterInteraction}
            onChange={(e) => setFilterInteraction(e.target.value)}
            className="bg-[#181c1f] border border-[#2e353c] text-xs text-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#d4af37] cursor-pointer"
          >
            <option value="ALL">Tüm Etkileşimler ▾</option>
            <option value="INTERACTIVE">Etkileşimli (Yanıt Verenler)</option>
            <option value="NON_INTERACTIVE">Etkileşimsiz</option>
          </select>

          {/* [Tüm Yöntemler ▾] */}
          <select
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
            className="bg-[#181c1f] border border-[#2e353c] text-xs text-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#d4af37] cursor-pointer"
          >
            <option value="ALL">Tüm Yöntemler ▾</option>
            <option value="AYET">Ayet Gönderimi</option>
            <option value="HADIS">Hadis Gönderimi</option>
            <option value="ALIM">Alim Sözleri</option>
            <option value="TARIH">Tarihte Bugün</option>
          </select>

          {/* [Tüm Gruplar ▾] */}
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="bg-[#181c1f] border border-[#2e353c] text-xs text-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#d4af37] cursor-pointer"
          >
            <option value="ALL">Tüm Gruplar ▾</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Abone Tablosu (Section 4) */}
      <div className="bg-[#121517] border border-[#23292e] rounded-3xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-12 text-center text-gray-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#d4af37]" />
            <p className="text-xs">Aboneler yükleniyor...</p>
          </div>
        ) : subscribers.length === 0 ? (
          <div className="p-12 text-center text-gray-500 space-y-3">
            <Users className="w-12 h-12 mx-auto opacity-30 text-[#d4af37]" />
            <h3 className="text-sm font-bold text-gray-300 font-serif-title">Henüz Abone Eklenmedi</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              "Rehberi Eşitle", "VCF Rehber Yükle" veya "+ Yeni Abone Ekle" butonlarını kullanarak listenizi oluşturabilirsiniz.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-[#161a1d] text-[11px] uppercase tracking-wider text-gray-400 border-b border-[#23292e] font-serif-title">
                <tr>
                  <th className="py-3.5 px-4">ABONE (İSİM & TELEFON)</th>
                  <th className="py-3.5 px-4">GRUP & KAYIT</th>
                  <th className="py-3.5 px-4">GÖNDERİM TERCİHLERİ</th>
                  <th className="py-3.5 px-4">DİL / SAAT</th>
                  <th className="py-3.5 px-4">DURUM & ETKİLEŞİM</th>
                  <th className="py-3.5 px-4">SON GÖNDERİM</th>
                  <th className="py-3.5 px-4 text-right">AKSİYONLAR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#23292e]/60 font-sans">
                {subscribers.map((sub) => {
                  return (
                    <tr key={sub.id} className="hover:bg-[#161a1d]/60 transition-colors">
                      {/* ABONE (İSİM & TELEFON) */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#d4af37]/20 to-[#10b981]/20 border border-[#d4af37]/30 flex items-center justify-center text-xs font-bold text-[#d4af37] font-mono shrink-0">
                            {sub.name ? sub.name.slice(0, 2).toUpperCase() : "AB"}
                          </div>
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{sub.name}</span>
                              {sub.company && (
                                <span className="text-[10px] text-gray-400 font-normal">({sub.company})</span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-400 font-mono">
                              {sub.phone.replace("+", "")}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* GRUP & KAYIT: Mavi etiketler */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {sub.groups && sub.groups.length > 0 ? (
                            sub.groups.map((g: any) => (
                              <span
                                key={g.groupId}
                                className="px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/30 text-[10px] font-semibold flex items-center gap-1"
                              >
                                <span>📁</span> {g.group?.name}
                              </span>
                            ))
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/30 text-[10px] font-semibold flex items-center gap-1">
                              <span>🌐</span> Rehber
                            </span>
                          )}
                        </div>
                      </td>

                      {/* GÖNDERİM TERCİHLERİ: Ayet(Yeşil), Hadis(Turuncu), Alim(Mor), Tarih(Kırmızı) */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="px-1.5 py-0.2 rounded bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30 text-[10px] font-bold">
                              Ayet
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                              Hadis
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                              Alim
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                              Tarih
                            </span>
                          </div>
                          <div className="text-[10px] text-gray-400 font-serif">
                            Arapça + Meal + Tefsir
                          </div>
                        </div>
                      </td>

                      {/* DİL / SAAT: TR rozeti ve saat (Örn: 08:00) */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-gray-300">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-[#181c1f] text-[#d4af37] border border-[#d4af37]/30 text-[10px] font-bold">
                            TR
                          </span>
                          <span className="text-gray-300 font-semibold">{sub.preferredTime || "08:00"}</span>
                        </div>
                      </td>

                      {/* DURUM & ETKİLEŞİM: "Aktif" (Yeşil) ve "💬 Etkileşimli" */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-full bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30 text-[10px] font-bold">
                            Aktif
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                            <span>💬</span> Etkileşimli
                          </span>
                        </div>
                      </td>

                      {/* SON GÖNDERİM */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-gray-400">
                        {sub.lastSentAt ? new Date(sub.lastSentAt).toLocaleDateString("tr-TR") : "Gönderilmedi"}
                      </td>

                      {/* AKSİYONLAR: [Düzenle], [Mesaj Gönder], [Detay], [Kara Liste], [Sil] */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Mesaj Gönder */}
                          <button
                            onClick={() => handleOpenSendMessage(sub)}
                            className="p-1.5 rounded-xl bg-[#10b981]/10 hover:bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/25 transition-all cursor-pointer"
                            title="Mesaj Gönder"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>

                          {/* Düzenle */}
                          <button
                            onClick={() => handleOpenEditModal(sub)}
                            className="p-1.5 rounded-xl bg-[#181c1f] hover:bg-[#202529] text-gray-300 border border-[#2e353c] transition-all cursor-pointer"
                            title="Düzenle"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Detay */}
                          <button
                            onClick={() => handleOpenEditModal(sub)}
                            className="p-1.5 rounded-xl bg-[#d4af37]/10 hover:bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/25 transition-all cursor-pointer"
                            title="Detay Gör"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>

                          {/* Sil */}
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

      {/* Yeni Abone Ekle / Düzenle Modalı */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-[#121517] border border-[#23292e] rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#23292e]">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#d4af37]" />
                <h3 className="text-base font-bold text-white font-serif-title">
                  {editingSub ? "Aboneyi Düzenle" : "Yeni Abone Tanımla"}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubscriber} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Abone Adı & Soyadı *</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Ahmet Yılmaz"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#181c1f] border border-[#2e353c] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37]"
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
                    className="w-full bg-[#181c1f] border border-[#2e353c] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Tercih Edilen Saat</label>
                  <input
                    type="time"
                    value={formData.preferredTime}
                    onChange={(e) => setFormData({ ...formData, preferredTime: e.target.value })}
                    className="w-full bg-[#181c1f] border border-[#2e353c] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37] font-mono"
                  />
                </div>
              </div>

              {/* Group selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Dahil Edilecek Gruplar</label>
                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-2 bg-[#181c1f] rounded-xl border border-[#2e353c]">
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
                          className="w-3.5 h-3.5 accent-[#d4af37]"
                        />
                        <span>{g.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#23292e]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#181c1f] hover:bg-[#202529] text-xs font-semibold text-gray-300 cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#10b981] hover:from-[#e5c158] hover:to-[#059669] text-black text-xs font-black shadow-lg shadow-[#d4af37]/20 cursor-pointer"
                >
                  {saving ? "Kaydediliyor..." : "Aboneyi Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VCF Rehber Yükleme Modalı */}
      {showVcfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-[#121517] border border-[#23292e] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#23292e]">
              <div className="flex items-center gap-2 text-emerald-400">
                <FileUp className="w-5 h-5" />
                <h3 className="text-sm font-bold text-white font-serif-title">VCF Dosyasından Rehber Aktarımı</h3>
              </div>
              <button onClick={() => setShowVcfModal(false)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-300">
              Telefonunuzdan dışa aktardığınız <strong>.vcf</strong> veya rehber dosyasını seçerek kişileri topluca sisteme ekleyin.
            </p>

            <div className="p-6 border-2 border-dashed border-[#2e353c] hover:border-[#d4af37] rounded-2xl text-center bg-[#181c1f] space-y-2">
              <FileUp className="w-8 h-8 mx-auto text-[#d4af37]" />
              <input
                type="file"
                accept=".vcf,.vcard"
                onChange={(e) => setVcfFile(e.target.files?.[0] || null)}
                className="text-xs text-gray-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#d4af37] file:text-black hover:file:bg-[#e5c158]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowVcfModal(false)}
                className="px-4 py-2 rounded-xl bg-[#181c1f] text-xs font-semibold text-gray-300 cursor-pointer"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleSyncContacts}
                className="px-5 py-2 rounded-xl bg-[#10b981] hover:bg-[#059669] text-white text-xs font-bold shadow-lg cursor-pointer"
              >
                İçeri Aktar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Anlık Mesaj Gönder Modalı */}
      {showMessageModal && msgTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-[#121517] border border-[#23292e] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#23292e]">
              <div className="flex items-center gap-2 text-[#10b981]">
                <MessageSquare className="w-5 h-5" />
                <h3 className="text-sm font-bold text-white font-serif-title">Anlık WhatsApp Mesajı</h3>
              </div>
              <button onClick={() => setShowMessageModal(false)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[#181c1f] border border-[#2e353c] text-xs text-gray-300 space-y-1">
              <div>Alıcı: <strong className="text-white">{msgTarget.name}</strong></div>
              <div className="font-mono text-[#10b981]">{msgTarget.phone}</div>
            </div>

            <form onSubmit={handleSendDirectMessage} className="space-y-3">
              <textarea
                rows={4}
                required
                value={msgContent}
                onChange={(e) => setMsgContent(e.target.value)}
                placeholder="Mesajınızı buraya yazın..."
                className="w-full bg-[#181c1f] border border-[#2e353c] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#10b981] resize-none"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMessageModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#181c1f] text-xs font-semibold text-gray-300 cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={sendingMsg}
                  className="px-5 py-2 rounded-xl bg-[#10b981] hover:bg-[#059669] text-white text-xs font-bold shadow-lg flex items-center gap-1.5 cursor-pointer"
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
