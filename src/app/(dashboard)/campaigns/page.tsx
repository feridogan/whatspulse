"use client";

import React, { useState, useEffect } from "react";
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
  Sparkles
} from "lucide-react";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showWizard, setShowWizard] = useState(false);

  // Wizard State
  const [wizardStep, setWizardStep] = useState(1);
  const [campaignTitle, setCampaignTitle] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [minDelay, setMinDelay] = useState(8);
  const [maxDelay, setMaxDelay] = useState(20);
  const [batchSize, setBatchSize] = useState(25);
  const [batchPause, setBatchPause] = useState(60);
  const [launching, setLaunching] = useState(false);

  // Detail Modal
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

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
      if (Array.isArray(grpData)) setGroups(grpData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

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

  const handleOpenDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/campaigns/${id}`);
      const data = await res.json();
      setSelectedCampaign(data);
      setShowDetailModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  // Clone / Re-launch Campaign (Pre-fills Wizard for Editing & Re-sending)
  const handleCloneCampaign = async (camp: any) => {
    try {
      let fullCamp = camp;
      if (!camp.messages || !camp.template) {
        const res = await fetch(`/api/campaigns/${camp.id}`);
        if (res.ok) {
          fullCamp = await res.json();
        }
      }

      setCampaignTitle(`${fullCamp.title || "Kampanya"} (Tekrar)`);
      setSelectedTemplateId(fullCamp.templateId || "");

      const initialContent = 
        fullCamp.template?.content || 
        fullCamp.messages?.[0]?.content || 
        "";
      setCustomMessage(initialContent);

      if (groups.length > 0) {
        setSelectedGroups(groups.map((g: any) => g.id));
      }

      setMinDelay(fullCamp.minDelay || 8);
      setMaxDelay(fullCamp.maxDelay || 20);
      setBatchSize(fullCamp.batchSize || 25);
      setBatchPause(fullCamp.batchPause || 60);

      setWizardStep(1);
      setShowWizard(true);
      setShowDetailModal(false);
    } catch (err: any) {
      console.error("Kampanya klonlama hatası:", err);
    }
  };

  const insertVariable = (tag: string) => {
    setCustomMessage((prev) => (prev ? `${prev} {${tag}}` : `{${tag}}`));
  };

  const handleLaunchCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignTitle) return;

    setLaunching(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: campaignTitle,
          templateId: selectedTemplateId || undefined,
          customContent: customMessage || undefined,
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
        setSelectedTemplateId("");
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111b21] border border-gray-800 rounded-3xl p-5 sm:p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
              Anti-Ban BullMQ Motoru
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">Toplu Mesaj & Kuyruk Yönetimi</h1>
          <p className="text-xs text-gray-400">
            Akıllı insansı gecikme (8-20 sn) ve parti molalarıyla spam engeline takılmadan toplu gönderim yapın.
          </p>
        </div>

        <button
          onClick={() => {
            setCampaignTitle("");
            setSelectedTemplateId("");
            setCustomMessage("");
            setSelectedGroups(groups.map((g: any) => g.id));
            setShowWizard(true);
            setWizardStep(1);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Kampanya Başlat</span>
        </button>
      </div>

      {/* Campaigns List / Monitor */}
      <div className="space-y-4">
        {campaigns.length === 0 ? (
          <div className="bg-[#111b21] border border-gray-800 rounded-3xl p-12 text-center text-gray-500">
            <Send className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <h3 className="text-sm font-semibold text-gray-300 mb-1">Henüz Kampanya Başlatılmadı</h3>
            <p className="text-xs text-gray-500 mb-4">Yukarıdaki butonu kullanarak ilk toplu mesaj kampanyasını oluşturabilirsiniz.</p>
          </div>
        ) : (
          campaigns.map((camp) => {
            const total = camp.totalCount || 0;
            const processed = (camp.sentCount || 0) + (camp.failedCount || 0);
            const progress = total > 0 ? Math.round((processed / total) * 100) : 0;
            const isProcessing = camp.status === "PROCESSING";

            return (
              <div
                key={camp.id}
                className="bg-[#111b21] border border-gray-800 rounded-3xl p-5 sm:p-6 hover:border-gray-700 transition-all shadow-lg"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-white">{camp.title}</h2>
                      <span className={`text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full ${
                        camp.status === "COMPLETED" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                        camp.status === "PROCESSING" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse" :
                        camp.status === "PAUSED" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
                        "bg-red-500/20 text-red-400 border border-red-500/30"
                      }`}>
                        {camp.status === "COMPLETED" ? "Tamamlandı" :
                         camp.status === "PROCESSING" ? "Gönderiliyor..." :
                         camp.status === "PAUSED" ? "Duraklatıldı" :
                         camp.status === "CANCELLED" ? "İptal Edildi" : camp.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mt-1">
                      {camp.template && (
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-emerald-400" />
                          Şablon: {camp.template.name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-teal-400" />
                        Gecikme: {camp.minDelay}-{camp.maxDelay} sn
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Tekrar Gönder / Klonla Butonu */}
                    <button
                      type="button"
                      onClick={() => handleCloneCampaign(camp)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Bu kampanyayı düzenleyip tekrar gönder"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Tekrar Gönder</span>
                    </button>

                    {isProcessing && (
                      <button
                        onClick={() => handleAction(camp.id, "pause")}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 text-xs font-semibold flex items-center gap-1 border border-amber-500/20"
                      >
                        <Pause className="w-3.5 h-3.5" />
                        <span>Duraklat</span>
                      </button>
                    )}

                    {camp.status === "PAUSED" && (
                      <button
                        onClick={() => handleAction(camp.id, "resume")}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-semibold flex items-center gap-1 border border-emerald-500/20"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Devam Et</span>
                      </button>
                    )}

                    {(isProcessing || camp.status === "PAUSED") && (
                      <button
                        onClick={() => handleAction(camp.id, "cancel")}
                        className="px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs font-semibold flex items-center gap-1 border border-red-500/20"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>İptal Et</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenDetail(camp.id)}
                      className="px-3 py-1.5 rounded-xl bg-[#202c33] hover:bg-[#2a3942] text-xs font-semibold text-gray-200 border border-gray-700"
                    >
                      Kayıtlar
                    </button>

                    <button
                      onClick={() => handleDelete(camp.id)}
                      className="p-1.5 rounded-xl text-red-400 hover:bg-red-500/20 transition-colors"
                      title="Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar & Counters */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-400 font-medium">
                    <span>İlerleme: %{progress}</span>
                    <span>
                      <strong className="text-emerald-400">{camp.sentCount}</strong> Başarılı /{" "}
                      <strong className="text-red-400">{camp.failedCount}</strong> Başarısız /{" "}
                      <strong className="text-white">{camp.totalCount}</strong> Toplam
                    </span>
                  </div>

                  <div className="w-full h-3 bg-[#202c33] rounded-full overflow-hidden p-0.5 border border-gray-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        camp.status === "COMPLETED" ? "bg-emerald-500" :
                        camp.status === "PAUSED" ? "bg-blue-500" :
                        "bg-gradient-to-r from-emerald-500 to-teal-400"
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Multi-Step Campaign Launch Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#111b21] border border-gray-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl">
            {/* Step Indicators */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  wizardStep === 1 ? "bg-emerald-600 text-white" : "bg-gray-800 text-gray-400"
                }`}>1</span>
                <span className="text-xs font-semibold text-white">Mesaj & İçerik</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-600" />
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  wizardStep === 2 ? "bg-emerald-600 text-white" : "bg-gray-800 text-gray-400"
                }`}>2</span>
                <span className="text-xs font-semibold text-white">Hedef Kitle</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-600" />
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  wizardStep === 3 ? "bg-emerald-600 text-white" : "bg-gray-800 text-gray-400"
                }`}>3</span>
                <span className="text-xs font-semibold text-white">Anti-Ban Ayarları</span>
              </div>
            </div>

            <form onSubmit={handleLaunchCampaign}>
              {/* STEP 1: Content & Title */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Kampanya Başlığı *</label>
                    <input
                      type="text"
                      required
                      value={campaignTitle}
                      onChange={(e) => setCampaignTitle(e.target.value)}
                      placeholder="Örn: 2026 Bahar İndirimi Duyurusu"
                      className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">
                      Hazır Şablon Seçin (Opsiyonel)
                    </label>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => {
                        const tId = e.target.value;
                        setSelectedTemplateId(tId);
                        const selectedTpl = templates.find((t: any) => t.id === tId);
                        if (selectedTpl) {
                          setCustomMessage(selectedTpl.content);
                        }
                      }}
                      className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="">(Özel Mesaj Yaz / Düzenle)</option>
                      {templates.map((t: any) => (
                        <option key={t.id} value={t.id}>{t.name} ({t.content.substring(0, 35)}...)</option>
                      ))}
                    </select>
                  </div>

                  {/* Message Content Area (Editable for both custom and template) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-gray-400">
                        Gönderilecek Mesaj Metni *
                      </label>
                      <span className="text-[11px] text-gray-500">
                        {customMessage.length} karakter
                      </span>
                    </div>

                    <textarea
                      rows={5}
                      required
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      placeholder="Merhaba {isim}, mesajınızı buraya yazın..."
                      className="w-full bg-[#202c33] border border-gray-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none font-sans"
                    />

                    {/* Dynamic Variable Chips */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[10px] text-gray-500 flex items-center gap-1 mr-1">
                        <Sparkles className="w-3 h-3 text-emerald-400" /> Değişken Ekle:
                      </span>
                      {[
                        { key: "isim", label: "{isim}" },
                        { key: "ad", label: "{ad}" },
                        { key: "soyad", label: "{soyad}" },
                        { key: "telefon", label: "{telefon}" },
                        { key: "tarih", label: "{tarih}" },
                        { key: "saat", label: "{saat}" },
                      ].map((chip) => (
                        <button
                          key={chip.key}
                          type="button"
                          onClick={() => insertVariable(chip.key)}
                          className="px-2 py-0.5 rounded-lg bg-[#111b21] hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono transition-all cursor-pointer"
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowWizard(false)}
                      className="px-4 py-2 rounded-xl bg-gray-800 text-xs font-semibold text-gray-300 hover:bg-gray-700 cursor-pointer"
                    >
                      İptal
                    </button>
                    <button
                      type="button"
                      disabled={!campaignTitle.trim() || !customMessage.trim()}
                      onClick={() => setWizardStep(2)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-bold text-white flex items-center gap-1 cursor-pointer"
                    >
                      <span>İleri (Hedef Kitle)</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Target Selection */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-gray-400">
                      Gönderim Yapılacak Gruplar *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedGroups.length === groups.length) {
                          setSelectedGroups([]);
                        } else {
                          setSelectedGroups(groups.map((g: any) => g.id));
                        }
                      }}
                      className="text-[11px] text-emerald-400 hover:underline font-semibold cursor-pointer"
                    >
                      {selectedGroups.length === groups.length ? "Tümünü Kaldır" : "Tüm Grupları Seç"}
                    </button>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
                    {groups.length === 0 ? (
                      <div className="text-xs text-gray-500 p-4 text-center bg-[#202c33] rounded-2xl">
                        Henüz özel grup oluşturulmamış. Kişiler sekmesinden grup oluşturabilirsiniz.
                      </div>
                    ) : (
                      groups.map((g: any) => {
                        const isChecked = selectedGroups.includes(g.id);
                        return (
                          <label
                            key={g.id}
                            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                              isChecked
                                ? "bg-emerald-500/15 border-emerald-500/40 text-white"
                                : "bg-[#202c33] border-gray-700 text-gray-300 hover:bg-[#2a3942]"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setSelectedGroups(selectedGroups.filter(id => id !== g.id));
                                  } else {
                                    setSelectedGroups([...selectedGroups, g.id]);
                                  }
                                }}
                                className="w-4 h-4 accent-emerald-500"
                              />
                              <span className="text-xs font-bold">{g.name}</span>
                            </div>
                            <span className="text-[11px] text-gray-400">{g._count?.contacts || 0} Kişi</span>
                          </label>
                        );
                      })
                    )}
                  </div>

                  <div className="flex justify-between gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setWizardStep(1)}
                      className="px-4 py-2 rounded-xl bg-gray-800 text-xs font-semibold text-gray-300 cursor-pointer"
                    >
                      Geri
                    </button>
                    <button
                      type="button"
                      disabled={selectedGroups.length === 0}
                      onClick={() => setWizardStep(3)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-bold text-white flex items-center gap-1 cursor-pointer"
                    >
                      <span>İleri (Anti-Ban Ayarları)</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Anti-Ban Delays & Batch Pause */}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex items-start gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-gray-300 space-y-1">
                      <p className="font-bold text-white">Akıllı Anti-Ban Gönderim Koruması</p>
                      <p className="text-[11px] text-gray-400">
                        WhatsApp spam filtrelerine takılmamak için mesajlar arasında rastgele insansı bekleme süresi ve parti aralarında soğuma molası verilir.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Min. Gecikme (sn)</label>
                      <input
                        type="number"
                        min={3}
                        value={minDelay}
                        onChange={(e) => setMinDelay(Number(e.target.value))}
                        className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Max. Gecikme (sn)</label>
                      <input
                        type="number"
                        min={minDelay}
                        value={maxDelay}
                        onChange={(e) => setMaxDelay(Number(e.target.value))}
                        className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Parti Büyüklüğü (Mesaj)</label>
                      <input
                        type="number"
                        min={5}
                        value={batchSize}
                        onChange={(e) => setBatchSize(Number(e.target.value))}
                        className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Parti Arası Mola (sn)</label>
                      <input
                        type="number"
                        min={10}
                        value={batchPause}
                        onChange={(e) => setBatchPause(Number(e.target.value))}
                        className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between gap-2 pt-3">
                    <button
                      type="button"
                      onClick={() => setWizardStep(2)}
                      className="px-4 py-2 rounded-xl bg-gray-800 text-xs font-semibold text-gray-300 cursor-pointer"
                    >
                      Geri
                    </button>
                    <button
                      type="submit"
                      disabled={launching}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-bold text-white shadow-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>{launching ? "Başlatılıyor..." : "Kampanyayı Kuyruğa Al & Başlat"}</span>
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Campaign Detail Modal */}
      {showDetailModal && selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#111b21] border border-gray-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-gray-800">
              <div>
                <h3 className="text-base font-bold text-white">{selectedCampaign.title}</h3>
                <p className="text-xs text-gray-400">Detaylı Mesaj Gönderim Kayıtları</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCloneCampaign(selectedCampaign)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Düzenle ve Yeniden Başlat</span>
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-white p-1"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-2 custom-scrollbar">
              {selectedCampaign.messages?.map((msg: any) => (
                <div
                  key={msg.id}
                  className="p-3 rounded-xl bg-[#202c33]/50 border border-gray-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold text-white">{msg.phone}</div>
                    <div className="text-[11px] text-gray-400 truncate max-w-md">{msg.content}</div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      msg.status === "SENT" || msg.status === "DELIVERED" || msg.status === "READ"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : msg.status === "FAILED"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-amber-500/20 text-amber-400"
                    }`}>
                      {msg.status}
                    </span>
                    {msg.errorMessage && (
                      <div className="text-[10px] text-red-400 mt-0.5">{msg.errorMessage}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
