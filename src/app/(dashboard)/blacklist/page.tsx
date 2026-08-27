'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Search, 
  AlertTriangle,
  CheckCircle,
  HelpCircle
} from 'lucide-react';

export default function BlacklistPage() {
  const [list, setList] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newReason, setNewReason] = useState('Manuel engelleme');

  const loadBlacklist = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/blacklist');
      const data = await res.json();
      if (Array.isArray(data)) {
        setList(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlacklist();
  }, []);

  const handleAddBlacklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone) return;

    try {
      const res = await fetch('/api/blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: newPhone,
          reason: newReason,
          addedBy: 'Admin',
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setNewPhone('');
        setNewReason('Manuel engelleme');
        loadBlacklist();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemove = async (phone: string) => {
    if (!confirm('Bu numaranın engelini kaldırmak istediğinize emin misiniz?')) return;
    try {
      await fetch(`/api/blacklist?phone=${encodeURIComponent(phone)}`, {
        method: 'DELETE',
      });
      loadBlacklist();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = list.filter((item) =>
    item.phone.includes(search) || (item.reason && item.reason.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111b21] border border-gray-800 rounded-3xl p-5 sm:p-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 text-xs font-semibold border border-red-500/20">
              {list.length} Engelli Numara
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">Kara Liste & Opt-Out Yönetimi</h1>
          <p className="text-xs text-gray-400">
            İptal talep eden (IPTAL, STOP) veya spam şikayeti oluşturan numaralara otomatik koruma sağlanır.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Numara Engelle</span>
        </button>
      </div>

      {/* Info Notice */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong>Otomatik Opt-Out Koruması Devrede:</strong> Müşterilerinizden biri &quot;IPTAL&quot;, &quot;STOP&quot;, &quot;RED&quot; veya &quot;ÇIK&quot; yazdığında sistem gelen mesajı yakalar, numarayı anında bu kara listeye ekler ve gelecekteki tüm toplu kampanya gönderimlerinden otomatik olarak muaf tutar.
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Numara veya engelleme sebebi ile ara..."
          className="w-full bg-[#111b21] border border-gray-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* List Table */}
      <div className="bg-[#111b21] border border-gray-800 rounded-3xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#202c33]/60 text-gray-400 font-semibold border-b border-gray-800">
            <tr>
              <th className="p-4">Telefon Numarası</th>
              <th className="p-4">Engelleme Sebebi</th>
              <th className="p-4 hidden sm:table-cell">Ekleyen</th>
              <th className="p-4 hidden md:table-cell">Tarih</th>
              <th className="p-4 text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  Kara listede numara bulunmuyor.
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id} className="hover:bg-[#202c33]/30 transition-colors">
                  <td className="p-4 font-mono font-bold text-red-400">
                    +{item.phone}
                  </td>
                  <td className="p-4 text-gray-300">
                    {item.reason || 'Kullanıcı talebi (Opt-Out)'}
                  </td>
                  <td className="p-4 hidden sm:table-cell text-gray-400">
                    <span className="px-2 py-0.5 rounded bg-gray-800 text-[10px]">
                      {item.addedBy || 'Auto'}
                    </span>
                  </td>
                  <td className="p-4 hidden md:table-cell text-gray-400">
                    {new Date(item.createdAt).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleRemove(item.phone)}
                      className="px-3 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold"
                    >
                      Engeli Kaldır
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#111b21] border border-gray-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              Numara Kara Listeye Ekle
            </h3>
            <form onSubmit={handleAddBlacklist} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Telefon Numarası</label>
                <input
                  type="text"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="905xxxxxxxxx"
                  className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Sebep</label>
                <input
                  type="text"
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  placeholder="Manuel engelleme / İptal talebi"
                  className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-medium text-gray-300"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white"
                >
                  Engelle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
