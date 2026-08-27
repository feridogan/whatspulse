'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Sparkles, 
  Image as ImageIcon, 
  Smartphone, 
  Check, 
  Copy,
  Tag
} from 'lucide-react';
import { replacePlaceholders } from '@/lib/utils';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [form, setForm] = useState({
    name: '',
    content: '',
    mediaType: 'text',
    mediaUrl: '',
    variables: [] as string[],
  });

  const availableTags = [
    { tag: '{isim}', label: 'Kişi Adı', sample: 'Ahmet Yılmaz' },
    { tag: '{telefon}', label: 'Telefon', sample: '+90 532 123 45 67' },
    { tag: '{tarih}', label: 'Bugünün Tarihi', sample: new Date().toLocaleDateString('tr-TR') },
    { tag: '{saat}', label: 'Saat', sample: '14:30' },
    { tag: '{sirket}', label: 'Şirket Adı', sample: 'Çakırlar A.Ş.' },
    { tag: '{ozel_1}', label: 'Özel Alan 1', sample: 'PULSE20' },
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
      content: prev.content + ' ' + tag,
    }));
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const previewText = replacePlaceholders(form.content || 'Merhaba {isim}, WhatsPulse ile hazırlanan mesaj önizlemesi!', {
    isim: 'Ahmet Yılmaz',
    name: 'Ahmet Yılmaz',
    telefon: '905321234567',
    sirket: 'Çakırlar A.Ş.',
    ozel_1: 'PULSE20',
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111b21] border border-gray-800 rounded-3xl p-5 sm:p-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
              {templates.length} Hazır Şablon
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">Mesaj Şablonları</h1>
          <p className="text-xs text-gray-400">
            Dinamik değişkenler (&#123;isim&#125;, &#123;tarih&#125;) ve medya ekleriyle kişiselleştirilmiş şablonlar oluşturun.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Şablon Oluştur</span>
        </button>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((tpl) => (
          <div key={tpl.id} className="bg-[#111b21] border border-gray-800 rounded-3xl p-5 flex flex-col justify-between hover:border-emerald-500/30 transition-all">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  {tpl.name}
                </span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-gray-800 text-gray-300">
                  {tpl.mediaType || 'text'}
                </span>
              </div>

              {tpl.mediaUrl && (
                <div className="mb-3 rounded-xl overflow-hidden h-32 bg-black/40">
                  <img src={tpl.mediaUrl} alt={tpl.name} className="w-full h-full object-cover" />
                </div>
              )}

              <div className="p-3 rounded-2xl bg-[#202c33]/40 border border-gray-800/80 text-xs text-gray-200 whitespace-pre-wrap leading-relaxed">
                {tpl.content}
              </div>

              {Array.isArray(tpl.variables) && tpl.variables.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {tpl.variables.map((v: string) => (
                    <span key={v} className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-mono">
                      &#123;{v}&#125;
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-800/80 flex items-center justify-end">
              <button
                onClick={() => handleDelete(tpl.id)}
                className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/20 text-xs flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sil</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Template Modal with Live Phone Preview */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-[#111b21] border border-gray-800 rounded-3xl max-w-3xl w-full p-6 shadow-2xl my-8">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              Yeni Şablon Oluştur
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Form Side */}
              <form onSubmit={handleSaveTemplate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Şablon Adı</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Örn: Özel Kampanya Duyurusu"
                    className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Variable Inserters */}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                    Dinamik Değişken Ekle (Tıklayın):
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {availableTags.map((item) => (
                      <button
                        key={item.tag}
                        type="button"
                        onClick={() => handleInsertTag(item.tag)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-[11px] font-mono transition-colors"
                      >
                        + {item.tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Mesaj Metni</label>
                  <textarea
                    rows={5}
                    required
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    placeholder="Merhaba {isim}, size özel fırsatlarımız..."
                    className="w-full bg-[#202c33] border border-gray-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Medya Türü & URL (İsteğe Bağlı)</label>
                  <div className="flex gap-2">
                    <select
                      value={form.mediaType}
                      onChange={(e) => setForm({ ...form, mediaType: e.target.value })}
                      className="bg-[#202c33] border border-gray-700 rounded-xl px-2 py-2 text-xs text-white"
                    >
                      <option value="text">Metin</option>
                      <option value="image">Görsel (Image)</option>
                      <option value="document">Belge (PDF)</option>
                    </select>
                    <input
                      type="url"
                      value={form.mediaUrl}
                      onChange={(e) => setForm({ ...form, mediaUrl: e.target.value })}
                      placeholder="https://example.com/gorsel.jpg"
                      className="flex-1 bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-medium text-gray-300"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg"
                  >
                    Şablonu Kaydet
                  </button>
                </div>
              </form>

              {/* Phone Mockup Side */}
              <div className="flex flex-col items-center justify-center p-4 bg-[#0b141a] rounded-2xl border border-gray-800">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                  Canlı WhatsApp Önizlemesi
                </div>

                <div className="w-full max-w-[280px] bg-[#111b21] border-2 border-gray-700 rounded-3xl p-3 shadow-2xl relative overflow-hidden">
                  <div className="h-4 w-24 bg-gray-800 rounded-full mx-auto mb-2" />
                  
                  {/* WhatsApp chat bubble */}
                  <div className="bg-[#005c4b] text-white p-3 rounded-2xl rounded-tr-none text-xs shadow-md mt-4">
                    {form.mediaUrl && (
                      <div className="mb-2 rounded-lg overflow-hidden h-28 bg-black/40">
                        <img src={form.mediaUrl} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{previewText}</p>
                    <div className="text-[9px] text-gray-300/70 text-right mt-1">12:00 ✓✓</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
