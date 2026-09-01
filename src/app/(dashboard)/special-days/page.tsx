"use client";

import React, { useState } from "react";
import { 
  Calendar, 
  Plus, 
  Search, 
  Send, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  Edit3, 
  Trash2, 
  BookOpen,
  Volume2
} from "lucide-react";

export default function SpecialDaysPage() {
  const [specialDays, setSpecialDays] = useState([
    {
      id: "1",
      title: "Kadir Gecesi Özel Tebriği",
      hijriDate: "27 Ramazan 1447",
      miladiDate: "2026-03-16",
      targetGroup: "Tüm Aboneler (1857 Kişi)",
      status: "PLANLANDI",
      content: "Bin aydan daha hayırlı olan Kadir Geceniz mübarek olsun. Dualarınız kabul, ibadetleriniz makbul olsun.",
      hasAudio: true,
    },
    {
      id: "2",
      title: "Ramazan Bayramı Tebriği",
      hijriDate: "1 Şevval 1447",
      miladiDate: "2026-03-20",
      targetGroup: "Tüm Aboneler",
      status: "PLANLANDI",
      content: "Ramazan Bayramınızı en kalbi duygularımızla kutlar, aileniz ve sevdiklerinizle huzurlu bir bayram dileriz.",
      hasAudio: true,
    },
    {
      id: "3",
      title: "Mevlid Kandili Mesajı",
      hijriDate: "12 Rebiülevvel 1448",
      miladiDate: "2026-08-25",
      targetGroup: "Tüm Aboneler",
      status: "HAZIR",
      content: "Peygamber Efendimiz (s.a.v)'in dünyayı teşriflerinin yıl dönümü olan Mevlid Kandiliniz mübarek olsun.",
      hasAudio: false,
    }
  ]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-[#121517] border border-[#23292e] shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#d4af37]/15 text-[#d4af37] text-xs font-bold border border-[#d4af37]/30 font-serif-title">
              DİNİ GÜNLER & KANDİLLER
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-1 font-serif-title">
            Özel Günler & Tebrik Takvimi
          </h1>
          <p className="text-xs text-gray-400">
            Kandil, Bayram ve Özel geceler için önceden planlanmış tebrik mesajlarını ve sesli tebrikleri yönetin.
          </p>
        </div>

        <button
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#10b981] hover:from-[#e5c158] hover:to-[#059669] text-black font-extrabold text-xs shadow-lg shadow-[#d4af37]/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-black" />
          <span>+ Yeni Özel Gün Tebriği Ekle</span>
        </button>
      </div>

      {/* Special Days List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {specialDays.map((day) => (
          <div
            key={day.id}
            className="p-5 rounded-3xl bg-[#121517] border border-[#23292e] hover:border-[#d4af37]/40 transition-all shadow-xl flex flex-col justify-between space-y-4 group"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-md bg-[#d4af37]/15 text-[#d4af37] text-[10px] font-bold border border-[#d4af37]/30">
                  {day.hijriDate}
                </span>
                <span className="text-[11px] font-mono text-gray-400 font-semibold">
                  {day.miladiDate}
                </span>
              </div>

              <h3 className="text-base font-bold text-white group-hover:text-[#d4af37] transition-colors font-serif-title">
                {day.title}
              </h3>

              <p className="text-xs text-gray-300 leading-relaxed bg-[#181c1f] p-3 rounded-2xl border border-[#2e353c]">
                "{day.content}"
              </p>

              <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1">
                <span>Hedef: <strong>{day.targetGroup}</strong></span>
                {day.hasAudio && (
                  <span className="text-[#10b981] font-bold flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5" /> AI Sesli
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#23292e]">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30">
                {day.status}
              </span>

              <div className="flex items-center gap-1.5">
                <button className="p-1.5 rounded-xl bg-[#10b981]/10 hover:bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/25 transition-all cursor-pointer" title="Hemen Gönder">
                  <Send className="w-3.5 h-3.5" />
                </button>
                <button className="p-1.5 rounded-xl bg-[#181c1f] hover:bg-[#202529] text-gray-300 border border-[#2e353c] transition-all cursor-pointer" title="Düzenle">
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all cursor-pointer" title="Sil">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
