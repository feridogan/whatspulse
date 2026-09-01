'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Sparkles, 
  Image as ImageIcon, 
  Check, 
  Copy,
  Tag,
  Search,
  RefreshCw,
  Send,
  X,
  MessageSquare,
  Bookmark
} from 'lucide-react';
import { replacePlaceholders } from '@/lib/utils';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    content: '',
    mediaType: 'text',
    mediaUrl: '',
    variables: [] as string[],
  });

  const availableTags = [
    { tag: '{ad}', label: 'Ad', sample: 'Ahmet' },
    { tag: '{soyad}', label: 'Soyad', sample: 'Yılmaz' },
    { tag: '{telefon}', label: 'Telefon', sample: '+90 532 123 45 67' },
    { tag: '{özel_not}', label: 'Özel Not', sample: 'Özel Müşteri Notu' },
    { tag: '{firma}', label: 'Firma', sample: 'Çakırlar Ltd.' },
    { tag: '{tarih}', label: 'Bugünün Tarihi', sample: new Date().toLocaleDateString('tr-TR') },
    { tag: '{saat}', label: 'Saat', sample: '14:30' },
  ];

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/templates');
      const data = await res.json();
      if (Array.isArray(data)) {
        setTemplates(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleInsertTag = (tag: string) => {
    setForm((prev) => ({
      ...prev,
      content: (prev.content ? prev.content + ' ' : '') + tag + ' ',
    }));
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.content.trim()) return;

    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setForm({ name: '', content: '', mediaType: 'text', mediaUrl: '', variables: [] });
        loadTemplates();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu şablonu silmek istediğinize emin misiniz?')) return;
    try {
      await fetch(`/api/templates/${id}`, { method: 'DELETE' });
      loadTemplates();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyContent = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const previewText = replacePlaceholders(form.content || 'Sayın {ad} {soyad}, {firma} adına iletilen mesajınız hazır!', {
    ad: 'Ahmet',
    soyad: 'Yılmaz',
    telefon: '+90 532 123 45 67',
    özel_not: 'Kampanya İndirimi',
    firma: 'Çakırlar A.Ş.',
    tarih: new Date().toLocaleDateString('tr-TR'),
    saat: '14:30',
  });

  const filteredTemplates = templates.filter(t => 
    t.name?.toLowerCase().includes(search.toLowerCase()) || 
    t.content?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-[#121517] border border-[#23292e] shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#d4af37]/15 text-[#d4af37] text-xs font-bold border border-[#d4af37]/30 font-serif-title">
              ŞABLON MERKEZİ
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-1 font-serif-title">
            WhatsApp Mesaj Şablonları
          </h1>
          <p className="text-xs text-gray-400">
            Dinamik değişkenli ({`{ad}`}, {`{soyad}`}, {`{özel_not}`}) hazır mesaj kalıpları oluşturun ve toplu gönderimlerde kullanın.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#10b981] hover:from-[#e5c158] hover:to-[#059669] text-black font-extrabold text-xs shadow-lg shadow-[#d4af37]/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-black" />
          <span>+ Yeni Şablon Oluştur</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-4 rounded-2xl bg-[#121517] border border-[#23292e] flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="🔍 Şablon başlığı veya içerikte ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#181c1f] border border-[#2e353c] rounded-xl pl-9 pr-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37]"
          />
        </div>

        <button
          onClick={loadTemplates}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#181c1f] hover:bg-[#202529] text-gray-300 border border-[#2e353c] text-xs font-bold cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#d4af37]' : ''}`} />
          <span>Yenile</span>
        </button>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="p-12 text-center text-gray-400 space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#d4af37]" />
          <p className="text-xs">Şablonlar yükleniyor...</p>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="p-12 text-center text-gray-500 bg-[#121517] border border-[#23292e] rounded-3xl space-y-3">
          <FileText className="w-12 h-12 mx-auto opacity-30 text-[#d4af37]" />
          <h3 className="text-sm font-bold text-gray-300 font-serif-title">Kayıtlı Şablon Bulunamadı</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            İlk mesaj şablonunuzu oluşturarak toplu gönderimlerinizi ve canlı sohbetlerinizi hızlandırın.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-[#181c1f] hover:bg-[#202529] text-[#d4af37] border border-[#d4af37]/30 text-xs font-bold transition-all cursor-pointer"
          >
            + Şablon Ekle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((t) => (
            <div
              key={t.id}
              className="p-5 rounded-3xl bg-[#121517] border border-[#23292e] hover:border-[#d4af37]/40 transition-all flex flex-col justify-between space-y-4 shadow-xl group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#d4af37] uppercase tracking-wider font-serif-title flex items-center gap-1.5">
                    <Bookmark className="w-3.5 h-3.5 text-[#d4af37]" />
                    {t.name}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30 font-mono font-bold">
                    {t.mediaType === 'image' ? 'Görselli' : 'Metin'}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#161a1d] border border-[#23292e] text-xs text-gray-200 leading-relaxed font-sans whitespace-pre-wrap max-h-36 overflow-y-auto">
                  {t.content}
                </div>

                {/* Variable tags preview */}
                {Array.isArray(t.variables) && t.variables.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {t.variables.map((v: string) => (
                      <span key={v} className="text-[10px] px-2 py-0.5 rounded-md bg-[#181c1f] text-gray-400 border border-[#2e353c] font-mono">
                        {`{${v}}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-[#23292e]/60">
                <Link
                  href={`/campaigns?templateId=${t.id}`}
                  className="flex items-center gap-1 text-xs font-bold text-[#10b981] hover:text-[#34d399] transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Toplu Gönder</span>
                </Link>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleCopyContent(t.id, t.content)}
                    className="p-2 rounded-xl bg-[#181c1f] hover:bg-[#202529] text-gray-300 border border-[#2e353c] transition-all cursor-pointer"
                    title="Metni Kopyala"
                  >
                    {copiedId === t.id ? <Check className="w-3.5 h-3.5 text-[#10b981]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all cursor-pointer"
                    title="Şablonu Sil"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE TEMPLATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-[#121517] border border-[#23292e] rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#23292e]">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#d4af37]" />
                <h3 className="text-base font-bold text-white font-serif-title">
                  Yeni Şablon Tanımla
                </h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1 font-serif-title">Şablon Başlığı *</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Özel Kampanya & İndirim Duyurusu"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-[#181c1f] border border-[#2e353c] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1 font-serif-title">Medya Türü</label>
                <select
                  value={form.mediaType}
                  onChange={(e) => setForm({ ...form, mediaType: e.target.value })}
                  className="w-full bg-[#181c1f] border border-[#2e353c] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37] cursor-pointer"
                >
                  <option value="text">Sadece Metin (Düz WhatsApp Mesajı)</option>
                  <option value="image">Görsel / Resim Ekli Mesaj</option>
                  <option value="document">PDF / Belge Ekli Mesaj</option>
                </select>
              </div>

              {form.mediaType !== 'text' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1 font-serif-title">Medya Dosya URL *</label>
                  <input
                    type="url"
                    placeholder="https://cakirlar.net/gorsel.jpg"
                    value={form.mediaUrl}
                    onChange={(e) => setForm({ ...form, mediaUrl: e.target.value })}
                    className="w-full bg-[#181c1f] border border-[#2e353c] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#d4af37]"
                  />
                </div>
              )}

              {/* Dynamic Tag insertion buttons */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 font-serif-title">
                  Dinamik Değişken Ekle (Tıklayarak Ekleyin):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {availableTags.map((t) => (
                    <button
                      key={t.tag}
                      type="button"
                      onClick={() => handleInsertTag(t.tag)}
                      className="px-2.5 py-1 rounded-lg bg-[#181c1f] hover:bg-[#202529] text-[#d4af37] border border-[#d4af37]/30 text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>+ {t.tag}</span>
                      <span className="text-[10px] text-gray-400 font-sans">({t.label})</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1 font-serif-title">Mesaj İçeriği *</label>
                <textarea
                  required
                  rows={5}
                  placeholder="Merhaba {ad} {soyad}, WhatsPulse üzerinden size özel hazırlanan teklifimiz..."
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="w-full bg-[#181c1f] border border-[#2e353c] rounded-xl p-3 text-xs text-white leading-relaxed focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              {/* Real-time Preview Box */}
              <div className="p-3.5 rounded-2xl bg-[#161a1d] border border-[#d4af37]/30 space-y-1.5">
                <span className="text-[10px] font-bold text-[#d4af37] uppercase font-serif-title">Canlı WhatsApp Önizleme</span>
                <p className="text-xs text-gray-200 leading-relaxed whitespace-pre-wrap font-sans">
                  {previewText}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#23292e]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#181c1f] text-xs font-semibold text-gray-300 cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#10b981] hover:from-[#e5c158] hover:to-[#059669] text-black text-xs font-black shadow-lg shadow-[#d4af37]/20 cursor-pointer"
                >
                  Şablonu Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
