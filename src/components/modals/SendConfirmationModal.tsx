'use client';

import React, { useState, useEffect, useMemo } from "react";
import { 
  Send, 
  ShieldCheck, 
  Users, 
  Clock, 
  AlertTriangle, 
  X, 
  Trash2, 
  Search, 
  CheckCircle2, 
  MessageSquare,
  Sparkles,
  Phone,
  FolderTree
} from "lucide-react";
import { replacePlaceholders } from "@/lib/utils";

export interface RecipientItem {
  id: string;
  name: string;
  phone: string;
  rawPhone?: string;
  email?: string | null;
  customFields?: any;
  source?: string;
  isValid?: boolean;
}

interface SendConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignTitle: string;
  messageText: string;
  groupNames: string[];
  initialRecipients: RecipientItem[];
  minDelay: number;
  maxDelay: number;
  scheduledAt?: string | null;
  deliveryWindow?: { start: string; end: string };
  onConfirm: (finalRecipients: RecipientItem[]) => void;
  isLaunching?: boolean;
}

export function SendConfirmationModal({
  isOpen,
  onClose,
  campaignTitle,
  messageText,
  groupNames,
  initialRecipients,
  minDelay,
  maxDelay,
  scheduledAt,
  deliveryWindow = { start: "08:00", end: "18:00" },
  onConfirm,
  isLaunching = false,
}: SendConfirmationModalProps) {
  const [recipients, setRecipients] = useState<RecipientItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (isOpen) {
      setRecipients(initialRecipients || []);
      setSearchTerm("");
    }
  }, [isOpen, initialRecipients]);

  const handleRemoveRecipient = (id: string) => {
    setRecipients((prev) => prev.filter((r) => r.id !== id));
  };

  const handleResetList = () => {
    setRecipients(initialRecipients || []);
  };

  // Filtered list based on search term
  const filteredRecipients = useMemo(() => {
    if (!searchTerm.trim()) return recipients;
    const q = searchTerm.toLowerCase().trim();
    return recipients.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.phone.toLowerCase().includes(q) ||
        (r.rawPhone && r.rawPhone.includes(q))
    );
  }, [recipients, searchTerm]);

  // Estimated Duration Calculation
  const estimatedTimeText = useMemo(() => {
    const count = recipients.length;
    if (count === 0) return "0 saniye";
    const minSec = count * minDelay;
    const maxSec = count * maxDelay;

    if (maxSec < 60) {
      return `~${minSec}-${maxSec} saniye`;
    }
    const minMin = Math.max(1, Math.floor(minSec / 60));
    const maxMin = Math.ceil(maxSec / 60);
    return `~${minMin}-${maxMin} dakika`;
  }, [recipients.length, minDelay, maxDelay]);

  // Sample message preview with 1st recipient
  const sampleRecipient = recipients[0] || {
    name: "Ahmet Yılmaz",
    phone: "+90 532 123 45 67",
  };

  const nameParts = (sampleRecipient.name || "").split(" ");
  const firstName = nameParts[0] || "Değerli Müşterimiz";
  const lastName = nameParts.slice(1).join(" ") || "";

  const previewContent = replacePlaceholders(messageText, {
    ad: firstName,
    soyad: lastName,
    isim: sampleRecipient.name,
    name: sampleRecipient.name,
    telefon: sampleRecipient.phone,
    phone: sampleRecipient.phone,
    özel_not: "VIP Özel Not",
    firma: "WhatsPulse",
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-[#121517] border border-[#23292e] rounded-3xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl flex flex-col max-h-[92vh] space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#23292e]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#d4af37]/20 via-[#10b981]/20 to-[#d4af37]/10 border border-[#d4af37]/35 flex items-center justify-center text-[#d4af37] shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-serif-title">
                🚀 Toplu Gönderim Ön Onayı & Alıcı Doğrulama
              </h3>
              <p className="text-[11px] text-gray-400">
                Mesajlar kuyruğa eklenmeden önce alıcı listesini ve mesaj içeriğini son kez onaylayın.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLaunching}
            className="p-1.5 rounded-xl bg-[#181c1f] text-gray-400 hover:text-white border border-[#2e353c] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Main Security Warning Banner */}
          <div className="p-3.5 rounded-2xl bg-[#10b981]/15 border border-[#10b981]/30 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#10b981] shrink-0 mt-0.5" />
            <div className="text-xs text-gray-200 leading-relaxed">
              <strong className="text-white font-bold block mb-0.5">
                Korumalı Hedefleme Doğrulaması:
              </strong>
              Bu işlem, seçtiğiniz <strong className="text-[#d4af37] font-semibold">{groupNames.join(", ")}</strong> grubundaki{" "}
              <strong className="text-[#10b981] font-mono font-bold">{recipients.length} kişiye</strong> sırayla WhatsApp mesajı gönderecektir. Genel rehberdeki diğer abonelere kesinlikle mesaj gönderilmez.
            </div>
          </div>

          {/* Delivery Window & Scheduled Info Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-[#161a1d] border border-[#2e353c] text-xs">
            <div className="flex items-center gap-2 text-gray-300">
              <Clock className="w-4 h-4 text-[#d4af37]" />
              <span>
                <strong>Zaman Penceresi Koruması:</strong> Mesajlar sadece <strong>{deliveryWindow.start} - {deliveryWindow.end}</strong> saatleri arasında iletilir.
              </span>
            </div>
            {scheduledAt ? (
              <span className="bg-[#d4af37]/15 text-[#d4af37] border border-[#d4af37]/30 px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold">
                ⏰ Planlanan Başlangıç: {new Date(scheduledAt).toLocaleString("tr-TR")}
              </span>
            ) : (
              <span className="bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30 px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold">
                🚀 Hemen Başlatılacak
              </span>
            )}
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Target Group */}
            <div className="p-3 rounded-2xl bg-[#161a1d] border border-[#23292e] flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#d4af37]/10 flex items-center justify-center text-[#d4af37] shrink-0">
                <FolderTree className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-gray-400 block uppercase font-mono">Hedef Grup</span>
                <span className="text-xs font-bold text-white truncate block" title={groupNames.join(", ")}>
                  {groupNames.join(", ")}
                </span>
              </div>
            </div>

            {/* Total Recipients */}
            <div className="p-3 rounded-2xl bg-[#161a1d] border border-[#23292e] flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#10b981]/10 flex items-center justify-center text-[#10b981] shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block uppercase font-mono">Onaylanan Alıcı</span>
                <span className="text-xs font-bold text-[#10b981] font-mono">
                  {recipients.length} Kişi
                </span>
              </div>
            </div>

            {/* Estimated Duration */}
            <div className="p-3 rounded-2xl bg-[#161a1d] border border-[#23292e] flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block uppercase font-mono">Tahmini Süre</span>
                <span className="text-xs font-bold text-gray-200 font-mono">
                  {estimatedTimeText}
                </span>
              </div>
            </div>
          </div>

          {/* Sample Message Preview Box */}
          <div className="p-3.5 rounded-2xl bg-[#161a1d] border border-[#d4af37]/30 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#d4af37] uppercase font-serif-title flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                Örnek Mesaj Önizlemesi ({sampleRecipient.name} için)
              </span>
              <span className="text-[10px] text-gray-400 font-mono">
                {minDelay}-{maxDelay} sn insansı gecikme
              </span>
            </div>
            <p className="p-3 rounded-xl bg-[#0e1113] text-xs text-gray-200 whitespace-pre-wrap leading-relaxed border border-[#23292e]">
              {previewContent}
            </p>
          </div>

          {/* Recipient List Management */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-gray-200 uppercase font-serif-title flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#10b981]" />
                  Mesaj Gönderilecek Kişiler ({recipients.length})
                </label>
                {recipients.length < initialRecipients.length && (
                  <button
                    type="button"
                    onClick={handleResetList}
                    className="text-[10px] text-[#d4af37] hover:underline font-semibold cursor-pointer"
                  >
                    (Listeyi Sıfırla: +{initialRecipients.length - recipients.length} kişi)
                  </button>
                )}
              </div>

              {/* Search filter in recipients */}
              <div className="relative w-full sm:w-60">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Alıcı ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#181c1f] border border-[#2e353c] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#d4af37]"
                />
              </div>
            </div>

            {/* Recipient Rows Container (Max height 240px, Scrollable) */}
            <div className="max-h-60 overflow-y-auto rounded-2xl border border-[#23292e] bg-[#0e1113] divide-y divide-[#23292e]/60">
              {filteredRecipients.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-400">
                  {recipients.length === 0 ? (
                    <div className="space-y-1">
                      <AlertTriangle className="w-6 h-6 mx-auto text-rose-400 opacity-60" />
                      <p className="font-semibold text-rose-300">Tüm alıcılar listeden çıkarıldı.</p>
                      <button
                        type="button"
                        onClick={handleResetList}
                        className="text-[11px] text-[#d4af37] hover:underline cursor-pointer"
                      >
                        Orijinal listeyi geri yükle
                      </button>
                    </div>
                  ) : (
                    "Arama kriterine uygun alıcı bulunamadı."
                  )}
                </div>
              ) : (
                filteredRecipients.map((recipient, idx) => {
                  const initials = (recipient.name || "A")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .substring(0, 2)
                    .toUpperCase();

                  return (
                    <div
                      key={recipient.id || idx}
                      className="p-2.5 sm:px-3.5 flex items-center justify-between gap-3 hover:bg-[#161a1d] transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Avatar */}
                        <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#d4af37]/20 to-[#10b981]/20 border border-[#d4af37]/30 flex items-center justify-center text-[10px] font-bold text-[#d4af37] shrink-0">
                          {initials}
                        </div>

                        {/* Name & Phone */}
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">
                            {recipient.name}
                          </div>
                          <div className="text-[11px] font-mono text-gray-400 flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-[#10b981]" />
                            <span>{recipient.phone}</span>
                            {recipient.isValid === false && (
                              <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1 py-0.5 rounded border border-amber-500/30">
                                Format Uyarısı
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Remove Button for this dispatch */}
                      <button
                        type="button"
                        onClick={() => handleRemoveRecipient(recipient.id)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[10px] font-semibold transition-all cursor-pointer flex items-center gap-1 shrink-0"
                        title="Bu gönderimden çıkar"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span className="hidden sm:inline">Çıkar</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[#23292e]">
          <button
            type="button"
            onClick={onClose}
            disabled={isLaunching}
            className="px-4 py-2 rounded-xl bg-[#181c1f] hover:bg-[#202529] text-xs font-semibold text-gray-300 border border-[#2e353c] cursor-pointer transition-colors"
          >
            İptal / Vazgeç
          </button>

          <button
            type="button"
            onClick={() => onConfirm(recipients)}
            disabled={recipients.length === 0 || isLaunching}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#10b981] via-[#059669] to-[#d4af37] hover:from-[#34d399] hover:to-[#e5c158] text-black font-black text-xs shadow-xl shadow-[#10b981]/25 transition-all transform active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-black" />
            <span>
              {isLaunching
                ? "Kuyruk Başlatılıyor..."
                : `✓ Onaylıyorum, ${recipients.length} Kişiye Gönder`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
