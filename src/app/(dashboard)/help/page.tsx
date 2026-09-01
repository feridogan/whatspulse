"use client";

import React from "react";
import { 
  HelpCircle, 
  BookOpen, 
  MessageSquare, 
  Users, 
  ShieldCheck, 
  Wifi, 
  Mic, 
  ExternalLink 
} from "lucide-react";

export default function HelpPage() {
  const faqs = [
    {
      q: "Hikmetnâme nedir ve nasıl çalışır?",
      a: "Hikmetnâme, kayıtlı abonelerinize her sabah/akşam otomatik veya anlık olarak ayet, hadis, dini bilgi ve sesli yapay zekâ mesajları (AI TTS) ulaştıran kurumsal WhatsApp yönetim platformudur."
    },
    {
      q: "Seslendirme Motoru (TTS) nasıl çalışır?",
      a: "Microsoft Edge AI Neural ses motoru kullanılarak metinler stüdyo kalitesinde Ahmet (Vakur Erkek) veya Emel ses karakterleri ile sese dönüştürülüp WhatsApp üzerinden sesli mesaj olarak iletilir."
    },
    {
      q: "Spam & Hat koruması nasıl sağlanır?",
      a: "Sistem, her mesaj gönderimi arasında insan simülasyonu sağlayan 5-15 saniyelik rastgele gecikmeler uygular ve 21:00 - 08:30 arası sessiz saatlerde gönderimleri kuyrukta bekletir."
    },
    {
      q: "Çift Pencereli grup yönetimi nasıl kullanılır?",
      a: "Gruplar menüsünde 'Yeni Grup Ekle' veya 'Düzenle'ye bastığınızda açılan panelde sağ taraftaki kişileri tek tıkla sol taraftaki gruba dahil edebilir, tek tıkla gruptan çıkarabilirsiniz."
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="p-5 sm:p-6 rounded-3xl bg-[#121517] border border-[#23292e] shadow-xl">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-[#d4af37]/15 text-[#d4af37] text-xs font-bold border border-[#d4af37]/30 font-serif-title">
            KULLANIM KILAVUZU & SSS
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-white mt-1 font-serif-title">
          Yardım & Destek Merkezi
        </h1>
        <p className="text-xs text-gray-400">
          Hikmetnâme sisteminin kullanımı, WhatsApp bağlantı ayarları ve yayın planlama hakkında rehber.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {faqs.map((faq, idx) => (
          <div key={idx} className="p-5 rounded-3xl bg-[#121517] border border-[#23292e] space-y-2 shadow-lg">
            <h3 className="text-sm font-bold text-[#d4af37] font-serif-title flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#d4af37] shrink-0" />
              <span>{faq.q}</span>
            </h3>
            <p className="text-xs text-gray-300 leading-relaxed font-sans">
              {faq.a}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
