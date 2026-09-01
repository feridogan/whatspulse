"use client";

import React, { useState } from "react";
import { 
  BookOpen, 
  Plus, 
  Search, 
  Send, 
  Volume2, 
  Sparkles, 
  Edit3, 
  Trash2, 
  Tag, 
  RefreshCw 
} from "lucide-react";

export default function HadithPage() {
  const [hadiths, setHadiths] = useState([
    {
      id: "1",
      arabic: "خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ",
      turkish: "Sizin en hayırlınız, Kur'an-ı Kerim'i öğrenen ve öğretendir.",
      source: "Buhârî, Fezâilü'l-Kur'ân 21",
      category: "İlim & Amel",
      tags: ["Hadis-i Şerif", "Öğrenme", "Kuran"]
    },
    {
      id: "2",
      arabic: "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ",
      turkish: "Ameller niyetlere göredir. Herkes için niyet ettiği şey vardır.",
      source: "Buhârî, Bed'ü'l-Vahy 1; Müslim, İmâre 155",
      category: "İhlas & Niyet",
      tags: ["Hadis-i Şerif", "Niyet", "İhlas"]
    },
    {
      id: "3",
      arabic: "مَنْ لَا يَرْحَمِ النَّاسَ لَا يَرْحَمْهُ اللَّهُ",
      turkish: "İnsanlara merhamet etmeyene Allah da merhamet etmez.",
      source: "Müslim, Fedâil 66",
      category: "Ahlak & Merhamet",
      tags: ["Ahlak", "Merhamet"]
    }
  ]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-[#121517] border border-[#23292e] shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#d4af37]/15 text-[#d4af37] text-xs font-bold border border-[#d4af37]/30 font-serif-title">
              HİKMET & RİVAYET KÜTÜPHANESİ
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-1 font-serif-title">
            Hadis & Hikmetli Sözler
          </h1>
          <p className="text-xs text-gray-400">
            Arapça metin, Türkçe meal ve kaynak bilgisiyle zenginleştirilmiş hadis ve hikmet arşivini yönetin.
          </p>
        </div>

        <button
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#10b981] hover:from-[#e5c158] hover:to-[#059669] text-black font-extrabold text-xs shadow-lg shadow-[#d4af37]/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-black" />
          <span>+ Yeni Hadis / Söz Ekle</span>
        </button>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {hadiths.map((item) => (
          <div
            key={item.id}
            className="p-5 sm:p-6 rounded-3xl bg-[#121517] border border-[#23292e] hover:border-[#d4af37]/40 transition-all shadow-xl space-y-3.5 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-md bg-[#d4af37]/15 text-[#d4af37] text-[10px] font-bold border border-[#d4af37]/30">
                  {item.category}
                </span>
                <span className="text-[11px] font-serif text-gray-400 italic">
                  {item.source}
                </span>
              </div>

              {/* Arabic */}
              <div className="p-4 rounded-2xl bg-[#161a1d] border border-[#2e353c] text-right font-serif text-base text-[#d4af37] font-semibold leading-relaxed">
                {item.arabic}
              </div>

              {/* Turkish */}
              <p className="text-xs text-gray-200 leading-relaxed font-sans">
                "{item.turkish}"
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 pt-1">
                {item.tags.map((t, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded-full bg-[#181c1f] text-gray-400 text-[10px] border border-[#2e353c]">
                    #{t}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#23292e]">
              <div className="flex items-center gap-1.5 text-xs text-[#10b981] font-semibold">
                <Volume2 className="w-4 h-4" />
                <span>AI Seslendirme Hazır</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button className="p-1.5 rounded-xl bg-[#10b981]/10 hover:bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/25 transition-all cursor-pointer" title="Hemen WhatsApptan Gönder">
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
