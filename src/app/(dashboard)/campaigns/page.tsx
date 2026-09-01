"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  Send, 
  Play, 
  Pause, 
  XCircle, 
  Trash2, 
  Clock, 
  ShieldCheck, 
  Users, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Plus,
  Layers,
  ChevronRight,
  RotateCcw,
  Copy,
  Sparkles,
  ArrowRight,
  X,
  Zap,
  FolderTree
} from "lucide-react";
import { replacePlaceholders } from "@/lib/utils";

function CampaignsContent() {
  const searchParams = useSearchParams();
  const preselectedGroupId = searchParams.get("groupId");
  const preselectedTemplateId = searchParams.get("templateId");

  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showWizard, setShowWizard] = useState(false);

  // Wizard State
  const [wizardStep, setWizardStep] = useState(1);
  const [campaignTitle, setCampaignTitle] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState(preselectedTemplateId || "");
  const [customMessage, setCustomMessage] = useState("");
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [minDelay, setMinDelay] = useState(5);
  const [maxDelay, setMaxDelay] = useState(15);
  const [batchSize, setBatchSize] = useState(25);
  const [batchPause, setBatchPause] = useState(30);
  const [launching, setLaunching] = useState(false);

  // Detail Modal
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const availableTags = [
    { tag: "{ad}", label: "Ad" },
    { tag: "{soyad}", label: "Soyad" },
    { tag: "{telefon}", label: "Telefon" },
    { tag: "{özel_not}", label: "Özel Not" },
    { tag: "{firma}", label: "Firma" },
  ];

  const loadData = async () => {
    try {
      setLoading(true);
      const [campRes, tplRes, grpRes] = await Promise.all([
        fetch("/api/campaigns"),
        fetch("/api/templates"),
        fetch("/api/groups"),
      ]);

      const campData = await campRes.json();
      const tplData = await tplRes.json();
      const grpData = await grpRes.json();

      if (Array.isArray(campData)) setCampaigns(campData);
      if (Array.isArray(tplData)) setTemplates(tplData);
      if (Array.isArray(grpData)) {
        setGroups(grpData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 6000);
    return () => clearInterval(interval);
  }, []);

  // Preselection trigger
  useEffect(() => {
    if (preselectedGroupId) {
      setSelectedGroups([preselectedGroupId]);
      setShowWizard(true);
      setWizardStep(1);
    }
    if (preselectedTemplateId) {
      setSelectedTemplateId(preselectedTemplateId);
      setShowWizard(true);
    }
  }, [preselectedGroupId, preselectedTemplateId]);

  // Sync template selection with custom message
  useEffect(() => {
    if (selectedTemplateId) {
      const found = templates.find((t) => t.id === selectedTemplateId);
      if (found) {
        setCustomMessage(found.content);
        if (!campaignTitle) setCampaignTitle(`${found.name} Kampanyası`);
      }
    }
  }, [selectedTemplateId, templates]);

  const handleAction = async (campaignId: string, action: "pause" | "resume" | "cancel") => {
    try {
      await fetch(`/api/campaigns/${campaignId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (campaignId: string) => {
    if (!confirm("Bu kampanyayı ve ilişkili mesaj kayıtlarını silmek istediğinize emin misiniz?")) return;
    try {
      await fetch(`/api/campaigns/${campaignId}`, { method: "DELETE" });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateAndLaunch = async () => {
    if (!campaignTitle.trim()) {
      alert("Lütfen kampanya başlığı giriniz.");
      return;
    }
    if (!customMessage.trim()) {
      alert("Lütfen mesaj metni giriniz.");
      return;
    }
    if (selectedGroups.length === 0) {
      alert("Lütfen en az bir hedef grup seçiniz.");
      return;
    }

    try {
      setLaunching(true);
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: campaignTitle,
          templateId: selectedTemplateId || null,
          customContent: customMessage,
          groupIds: selectedGroups,
          targetGroupIds: selectedGroups,
          minDelay: Number(minDelay),
          maxDelay: Number(maxDelay),
          batchSize: Number(batchSize),
          batchPause: Number(batchPause),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowWizard(false);
        setWizardStep(1);
        setCampaignTitle("");
        setCustomMessage("");
        setSelectedGroups([]);
        loadData();
      } else {
        alert(data.error || "Kampanya başlatılamadı.");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLaunching(false);
    }
  };

  const toggleGroupSelection = (groupId: string) => {
    setSelectedGroups((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  const selectAllGroups = () => {
    if (selectedGroups.length === groups.length) {
      setSelectedGroups([]);
    } else {
      setSelectedGroups(groups.map((g) => g.id));
    }
  };

  const insertTag = (tag: string) => {
    setCustomMessage((prev) => (prev ? prev + " " : "") + tag + " ");
  };

  const previewMessage = replacePlaceholders(customMessage || "Sayın {ad} {soyad}, WhatsPulse mesajınız iletildi.", {
    ad: "Ahmet",
    soyad: "Yılmaz",
    telefon: "+90 532 123 45 67",
    özel_not: "VIP Özel İndirim",
    firma: "Çakırlar A.Ş.",
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-[#121517] border border-[#23292e] shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#10b981]/15 text-[#10b981] text-xs font-bold border border-[#10b981]/30 font-serif-title">
              TOPLU GÖNDERİM & KUYRUK
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-1 font-serif-title">
            Toplu WhatsApp Kampanyaları
          </h1>
          <p className="text-xs text-gray-400">
            Hedef müşteri gruplarına insansı gecikme (5-15 sn) ve anti-spam korumasıyla toplu mesaj gönderin.
          </p>
        </div>

        <button
          onClick={() => {
            setShowWizard(true);
            setWizardStep(1);
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#10b981] hover:from-[#e5c158] hover:to-[#059669] text-black font-extrabold text-xs shadow-lg shadow-[#d4af37]/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-black" />
          <span>🚀 Yeni Toplu Gönderim Başlat</span>
        </button>
      </div>

      {/* Campaigns List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400 font-serif-title">
            GÖNDERİM GEÇMİŞİ VE CANLI KUYRUK ({campaigns.length})
          </span>
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#181c1f] hover:bg-[#202529] text-gray-300 border border-[#2e353c] text-xs font-bold cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#d4af37]" : ""}`} />
            <span>Yenile</span>
          </button>
        </div>

        {loading && campaigns.length === 0 ? (
          <div className="p-12 text-center text-gray-400 space-y-2 bg-[#121517] border border-[#23292e] rounded-3xl">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#d4af37]" />
            <p className="text-xs">Kampanyalar yükleniyor...</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-12 text-center text-gray-500 bg-[#121517] border border-[#23292e] rounded-3xl space-y-3">
            <Send className="w-12 h-12 mx-auto opacity-30 text-[#10b981]" />
            <h3 className="text-sm font-bold text-gray-300 font-serif-title">Henüz Gönderim Yapılmadı</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Gruplarınıza veya abonelerinize toplu WhatsApp mesajı göndermek için yukarıdaki butona tıklayın.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {campaigns.map((camp) => {
              const progress = camp.totalCount > 0 ? Math.round((camp.sentCount / camp.totalCount) * 100) : 0;
              const isProcessing = camp.status === "PROCESSING" || camp.status === "QUEUED";

              return (
                <div
                  key={camp.id}
                  className="p-5 rounded-3xl bg-[#121517] border border-[#23292e] hover:border-[#d4af37]/40 transition-all space-y-4 shadow-xl"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white font-serif-title">{camp.title}</h3>
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold border ${
                          camp.status === "COMPLETED"
                            ? "bg-[#10b981]/15 text-[#10b981] border-[#10b981]/30"
                            : isProcessing
                            ? "bg-[#d4af37]/15 text-[#d4af37] border-[#d4af37]/30 animate-pulse"
                            : camp.status === "PAUSED"
                            ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                            : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                        }`}>
                          {camp.status === "COMPLETED" ? "TAMAMLANDI" : isProcessing ? "GÖNDERİLİYOR" : camp.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Başlangıç: {new Date(camp.createdAt).toLocaleString("tr-TR")}
                      </p>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      {isProcessing && (
                        <button
                          onClick={() => handleAction(camp.id, "pause")}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-xs font-bold cursor-pointer"
                        >
                          <Pause className="w-3.5 h-3.5" />
                          <span>Duraklat</span>
                        </button>
                      )}
                      {camp.status === "PAUSED" && (
                        <button
                          onClick={() => handleAction(camp.id, "resume")}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#10b981]/10 hover:bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/20 text-xs font-bold cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Devam Et</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(camp.id)}
                        className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all cursor-pointer"
                        title="Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-gray-400">İlerleme: %{progress}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[#10b981] font-bold">✓ İletilen: {camp.sentCount}</span>
                        <span className="text-rose-400 font-bold">✗ Hatalı: {camp.failedCount}</span>
                        <span className="text-gray-400">Toplam: {camp.totalCount}</span>
                      </div>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-[#181c1f] overflow-hidden border border-[#2e353c]">
                      <div
                        className="h-full bg-gradient-to-r from-[#d4af37] to-[#10b981] transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* TOPLU GÖNDERİM SİHİRBAZI MODALI (4 ADIM) */}
      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-[#121517] border border-[#23292e] rounded-3xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl flex flex-col max-h-[92vh] space-y-4">
            {/* Wizard Header & Stepper */}
            <div className="flex items-center justify-between pb-3 border-b border-[#23292e]">
              <div>
                <h3 className="text-base font-bold text-white font-serif-title">
                  Toplu WhatsApp Gönderim Sihirbazı
                </h3>
                <p className="text-[11px] text-gray-400">
                  Adım {wizardStep} / 4 : {
                    wizardStep === 1 ? "Hedef Kitle Seçimi" :
                    wizardStep === 2 ? "Mesaj & Şablon" :
                    wizardStep === 3 ? "Anti-Spam & Gecikme Ayarları" :
                    "Onay ve Gönderim"
                  }
                </p>
              </div>
              <button onClick={() => setShowWizard(false)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper Indicator */}
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  onClick={() => step < wizardStep && setWizardStep(step)}
                  className={`h-1.5 rounded-full transition-all ${
                    step <= wizardStep ? "bg-[#10b981]" : "bg-[#23292e]"
                  }`}
                />
              ))}
            </div>

            {/* Step 1: Hedef Kitle (Gruplar) */}
            {wizardStep === 1 && (
              <div className="space-y-4 flex-1 overflow-y-auto">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-200 font-serif-title uppercase">
                    Hedef Grupları Seçin ({selectedGroups.length}/{groups.length})
                  </label>
                  {groups.length > 0 && (
                    <button
                      type="button"
                      onClick={selectAllGroups}
                      className="text-xs font-bold text-[#d4af37] hover:underline cursor-pointer"
                    >
                      {selectedGroups.length === groups.length ? "Tümünün Seçimini Kaldır" : "Tüm Grupları Seç"}
                    </button>
                  )}
                </div>

                {/* Recipient summary banner */}
                {selectedGroups.length > 0 && (
                  <div className="p-3 rounded-2xl bg-[#10b981]/15 border border-[#10b981]/30 flex items-center justify-between text-xs">
                    <span className="text-gray-300 font-medium">
                      🎯 Seçilen Grup: <strong className="text-white font-bold">{groups.filter(g => selectedGroups.includes(g.id)).map(g => g.name).join(", ")}</strong>
                    </span>
                    <span className="font-mono font-bold text-[#10b981] bg-[#10b981]/20 px-2.5 py-1 rounded-full border border-[#10b981]/30">
                      {groups.filter(g => selectedGroups.includes(g.id)).reduce((acc, g) => acc + (g.memberCount ?? g.contacts?.length ?? g.subscribers?.length ?? g._count?.contacts ?? g._count?.subscribers ?? 0), 0)} Kişi Hedeflendi
                    </span>
                  </div>
                )}

                {groups.length === 0 ? (
                  <div className="p-8 text-center bg-[#161a1d] border border-[#23292e] rounded-2xl space-y-2">
                    <FolderTree className="w-8 h-8 mx-auto text-[#d4af37] opacity-40" />
                    <p className="text-xs text-gray-300">Henüz tanımlı grup bulunmamaktadır.</p>
                    <Link
                      href="/groups"
                      className="inline-block px-3 py-1.5 rounded-xl bg-[#10b981] text-white text-xs font-bold"
                    >
                      + Grup Oluştur
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {groups.map((g) => {
                      const isSelected = selectedGroups.includes(g.id);
                      const memberCount = g.memberCount ?? g.contacts?.length ?? g.subscribers?.length ?? g._count?.contacts ?? g._count?.subscribers ?? 0;
                      return (
                        <div
                          key={g.id}
                          onClick={() => toggleGroupSelection(g.id)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? "bg-[#16291e] border-[#10b981] text-white shadow-lg shadow-[#10b981]/5"
                              : "bg-[#161a1d] border-[#2e353c] text-gray-300 hover:border-[#d4af37]/40"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold truncate">{g.name}</div>
                            <div className="text-[11px] font-mono text-gray-400 truncate mt-0.5 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></span>
                              <span>{memberCount} Aktif Abone</span>
                            </div>
                          </div>
                          <div className={`w-5 h-5 rounded-lg border flex items-center justify-center ${
                            isSelected ? "bg-[#10b981] border-[#10b981] text-black" : "border-gray-500"
                          }`}>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Mesaj & Şablon Seçimi */}
            {wizardStep === 2 && (
              <div className="space-y-4 flex-1 overflow-y-auto">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1 font-serif-title">
                    Kampanya Başlığı *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: 2026 Bahar Özel İndirim Duyurusu"
                    value={campaignTitle}
                    onChange={(e) => setCampaignTitle(e.target.value)}
                    className="w-full bg-[#181c1f] border border-[#2e353c] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                  />
                </div>

                {templates.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1 font-serif-title">
                      Kayıtlı Şablonlardan Seçin (Opsiyonel)
                    </label>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                      className="w-full bg-[#181c1f] border border-[#2e353c] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37] cursor-pointer"
                    >
                      <option value="">-- Özel Mesaj Yaz --</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Dynamic Tag Buttons */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5 font-serif-title">
                    Dinamik Etiketler (Kişiye Özel Alanlar):
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {availableTags.map((t) => (
                      <button
                        key={t.tag}
                        type="button"
                        onClick={() => insertTag(t.tag)}
                        className="px-2.5 py-1 rounded-lg bg-[#181c1f] hover:bg-[#202529] text-[#d4af37] border border-[#d4af37]/30 text-xs font-mono font-bold transition-all cursor-pointer"
                      >
                        + {t.tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1 font-serif-title">
                    Mesaj Metni *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Merhaba {ad}, WhatsPulse özel mesajınız..."
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    className="w-full bg-[#181c1f] border border-[#2e353c] rounded-xl p-3 text-xs text-white leading-relaxed focus:outline-none focus:border-[#d4af37]"
                  />
                </div>

                {/* Live Preview */}
                <div className="p-3.5 rounded-2xl bg-[#161a1d] border border-[#d4af37]/30 space-y-1">
                  <span className="text-[10px] font-bold text-[#d4af37] uppercase font-serif-title">Canlı Önizleme</span>
                  <p className="text-xs text-gray-200 leading-relaxed whitespace-pre-wrap">{previewMessage}</p>
                </div>
              </div>
            )}

            {/* Step 3: Anti-Spam & Gecikme */}
            {wizardStep === 3 && (
              <div className="space-y-4 flex-1 overflow-y-auto">
                <div className="p-3.5 rounded-2xl bg-[#121517] border border-[#10b981]/30 flex items-center gap-2.5 text-xs text-[#10b981]">
                  <ShieldCheck className="w-5 h-5 text-[#10b981] shrink-0" />
                  <span>
                    WhatsApp algoritmasının spam korumasını aşmak için mesajlar arasında dinamik insansı bekleme uygulanır.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1 font-serif-title">
                      Minimum Gecikme (Saniye)
                    </label>
                    <input
                      type="number"
                      min={3}
                      max={60}
                      value={minDelay}
                      onChange={(e) => setMinDelay(Number(e.target.value))}
                      className="w-full bg-[#181c1f] border border-[#2e353c] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1 font-serif-title">
                      Maksimum Gecikme (Saniye)
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={120}
                      value={maxDelay}
                      onChange={(e) => setMaxDelay(Number(e.target.value))}
                      className="w-full bg-[#181c1f] border border-[#2e353c] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1 font-serif-title">
                      Paket Boyutu (Her X mesajda bir mola)
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={100}
                      value={batchSize}
                      onChange={(e) => setBatchSize(Number(e.target.value))}
                      className="w-full bg-[#181c1f] border border-[#2e353c] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1 font-serif-title">
                      Paket Molası (Saniye)
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={300}
                      value={batchPause}
                      onChange={(e) => setBatchPause(Number(e.target.value))}
                      className="w-full bg-[#181c1f] border border-[#2e353c] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Özet ve Onay */}
            {wizardStep === 4 && (
              <div className="space-y-4 flex-1 overflow-y-auto">
                <div className="p-4 rounded-2xl bg-[#161a1d] border border-[#23292e] space-y-3 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-[#23292e]">
                    <span className="text-gray-400">Kampanya Adı:</span>
                    <span className="font-bold text-white">{campaignTitle}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#23292e]">
                    <span className="text-gray-400">Hedef Grup(lar):</span>
                    <span className="font-bold text-[#d4af37] font-mono">
                      {groups.filter(g => selectedGroups.includes(g.id)).map(g => `${g.name} (${g.memberCount ?? g.contacts?.length ?? g.subscribers?.length ?? g._count?.contacts ?? g._count?.subscribers ?? 0} Kişi)`).join(", ")}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#23292e]">
                    <span className="text-gray-400">Toplam Gönderilecek Kişi:</span>
                    <span className="font-bold text-[#10b981] font-mono text-sm">
                      {groups.filter(g => selectedGroups.includes(g.id)).reduce((acc, g) => acc + (g.memberCount ?? g.contacts?.length ?? g.subscribers?.length ?? g._count?.contacts ?? g._count?.subscribers ?? 0), 0)} Kişi
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#23292e]">
                    <span className="text-gray-400">Gecikme Aralığı:</span>
                    <span className="font-mono text-[#10b981]">{minDelay} - {maxDelay} sn / mesaj</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#10b981]/10 border border-[#10b981]/25 text-[11px] text-[#10b981] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 shrink-0 text-[#10b981]" />
                    <span><strong>Korumalı Hedefleme:</strong> Mesajlar SADECE seçilen gruptaki üyelere gönderilir, genel rehberdeki diğer kişilere kesinlikle mesaj iletilmez.</span>
                  </div>
                  <div className="pt-2">
                    <span className="text-gray-400 block mb-1">Gönderilecek Mesaj:</span>
                    <p className="p-3 rounded-xl bg-[#121517] text-gray-200 whitespace-pre-wrap">{customMessage}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Wizard Navigation Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-[#23292e]">
              {wizardStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setWizardStep(wizardStep - 1)}
                  className="px-4 py-2 rounded-xl bg-[#181c1f] text-xs font-semibold text-gray-300 hover:text-white cursor-pointer"
                >
                  ← Geri
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowWizard(false)}
                  className="px-4 py-2 rounded-xl bg-[#181c1f] text-xs font-semibold text-gray-300 cursor-pointer"
                >
                  İptal
                </button>
                {wizardStep < 4 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (wizardStep === 1 && selectedGroups.length === 0) {
                        alert("Lütfen en az bir hedef grup seçiniz.");
                        return;
                      }
                      if (wizardStep === 2 && (!campaignTitle.trim() || !customMessage.trim())) {
                        alert("Lütfen kampanya başlığı ve mesaj metnini doldurunuz.");
                        return;
                      }
                      setWizardStep(wizardStep + 1);
                    }}
                    className="flex items-center gap-1 px-5 py-2 rounded-xl bg-[#d4af37] hover:bg-[#e5c158] text-black text-xs font-black shadow-lg cursor-pointer"
                  >
                    <span>İleri</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCreateAndLaunch}
                    disabled={launching}
                    className="flex items-center gap-1.5 px-6 py-2 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#10b981] hover:from-[#e5c158] hover:to-[#059669] text-black text-xs font-black shadow-xl shadow-[#10b981]/20 cursor-pointer"
                  >
                    <Send className="w-4 h-4 text-black" />
                    <span>{launching ? "Başlatılıyor..." : "🚀 Gönderimi Başlat"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CampaignsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-gray-400">Kampanya modülü yükleniyor...</div>}>
      <CampaignsContent />
    </Suspense>
  );
}
