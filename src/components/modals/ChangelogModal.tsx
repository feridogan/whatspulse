'use client';

import React from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  X, 
  Activity, 
  ShieldCheck, 
  Users, 
  MessageSquare, 
  FileText,
  Clock,
  Send,
  Calendar
} from 'lucide-react';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangelogModal({ isOpen, onClose }: ChangelogModalProps) {
  if (!isOpen) return null;

  const versions = [
    {
      version: 'v2.5.2',
      date: '04 Eylül 2026',
      badge: 'GÜNCEL SÜRÜM',
      badgeColor: 'bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30',
      highlights: [
        {
          title: '📐 Responsive Tablo & Ekrana Tam Uyum',
          desc: 'Kişiler tablosu responsive grid yapısı yenilendi; ekran taşması ve numara satır kırılmaları düzeltildi.',
          icon: Sparkles,
        },
        {
          title: '🧹 İsimsiz & Geçersiz Kayıt Temizliği',
          desc: 'İsmi olmayan, sadece numaradan ibaret olan ve sembollerle (., -, vb.) başlayan geçersiz kayıtlar rehberden temizlendi.',
          icon: ShieldCheck,
        },
        {
          title: '🛡️ Yalnızca İsimli Kişiler Senkronizasyonu',
          desc: 'WhatsApp senkronizasyonuna "Yalnızca İsimli Kişiler" filtresi eklendi; çöp kayıtların içeri aktarılması engellendi.',
          icon: Users,
        },
      ],
    },
    {
      version: 'v2.5.1',
      date: '03 Eylül 2026',
      badge: 'ÖNCEKİ SÜRÜM',
      badgeColor: 'bg-gray-700/30 text-gray-400 border-gray-600/30',
      highlights: [
        {
          title: 'Toplu Mesaj Görsel Arayüz Onarımı',
          desc: 'Toplu mesaj gönderim ekranındaki görsel çökme hatası (MessageSquare) giderildi.',
          icon: MessageSquare,
        },
        {
          title: 'Mükerrer & Çöp Numara Temizlik Motoru',
          desc: 'Mükerrer (çift kayıtlı) kişiler ve geçersiz yabancı spam numaraları temizlendi.',
          icon: ShieldCheck,
        },
        {
          title: 'Gönderim Öncesi Onay & Alıcı Önizleme',
          desc: 'Toplu mesaj öncesi onay ve alıcı listesi önizleme mekanizması entegre edildi.',
          icon: Users,
        },
        {
          title: 'Rehberde Özel İsim Koruması (isCustomName)',
          desc: 'Rehber senkronizasyonunda el ile tanımlanan isimlerin ezilmesini önleyen özel isim koruması devreye alındı.',
          icon: CheckCircle2,
        },
      ],
    },
    {
      version: 'v2.4.0',
      date: '28 Ağustos 2026',
      badge: 'STABİL SÜRÜM',
      badgeColor: 'bg-[#d4af37]/20 text-[#d4af37] border-[#d4af37]/30',
      highlights: [
        {
          title: 'Çift Pencereli Grup Segmentasyonu',
          desc: 'Çift pencereli grup segmentasyonu ve hızlı kişi atama altyapısı tamamlandı.',
          icon: Users,
        },
        {
          title: 'Dini & Resmi Günler Şablon Kütüphanesi',
          desc: 'Dini ve resmi günler için hazır şablon kütüphanesi eklendi.',
          icon: FileText,
        },
        {
          title: 'Sessiz Saatler & Zaman Planlayıcı',
          desc: 'İleri tarihli kampanya zamanlayıcısı ve gece saatleri otomatik gönderim duraklatma sistemi entegre edildi.',
          icon: Clock,
        },
      ],
    },
    {
      version: 'v2.3.0',
      date: '20 Ağustos 2026',
      badge: 'KURUMSAL SÜRÜM',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      highlights: [
        {
          title: 'Lüks Tasarım & Çoklu Kullanıcı Mimarisi',
          desc: 'Koyu altın & zümrüt tema, rol bazlı yetkilendirme (Admin/User) ve anlık WhatsApp oturum izleme.',
          icon: Sparkles,
        },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-[#121517] border border-[#23292e] rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl flex flex-col max-h-[90vh] space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#23292e]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#d4af37]/20 to-[#10b981]/20 border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-serif-title">
                WhatsPulse Güncelleme Geçmişi
              </h3>
              <p className="text-[11px] text-gray-400">
                WhatsPulse PRO sistem güncelleme geçmişi ve sürüm notları.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-[#181c1f] text-gray-400 hover:text-white border border-[#2e353c] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {versions.map((v, i) => (
            <div
              key={v.version}
              className={`p-4 rounded-2xl border transition-all space-y-3 ${
                i === 0
                  ? 'bg-gradient-to-b from-[#14191c] to-[#121517] border-[#d4af37]/35 shadow-lg'
                  : 'bg-[#141719] border-[#23292e]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white font-mono">{v.version}</span>
                  <span className={`text-[9px] uppercase font-mono font-bold px-2 py-0.5 rounded-full border ${v.badgeColor}`}>
                    {v.badge}
                  </span>
                </div>
                <span className="text-[11px] text-gray-400 font-mono flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-gray-500" />
                  {v.date}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2 pt-1">
                {v.highlights.map((h, idx) => {
                  const Icon = h.icon;
                  return (
                    <div key={idx} className="flex items-start gap-2.5 p-2 rounded-xl bg-[#181c1f]/60 border border-[#23292e]/80">
                      <div className="w-6 h-6 rounded-lg bg-[#d4af37]/10 flex items-center justify-center text-[#d4af37] shrink-0 mt-0.5">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-gray-200">{h.title}</h4>
                        <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{h.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[#23292e]">
          <span className="text-[11px] text-gray-500 font-mono">
            WhatsPulse PRO SaaS Engine © 2026
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#181c1f] hover:bg-[#202529] text-xs font-bold text-gray-300 border border-[#2e353c] cursor-pointer"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
