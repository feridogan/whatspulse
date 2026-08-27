'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Upload, 
  Smartphone, 
  Search, 
  Filter, 
  Trash2, 
  Edit2, 
  Tag, 
  RefreshCw, 
  FileSpreadsheet, 
  Contact as ContactIcon,
  CheckCircle,
  FolderPlus,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'contacts' | 'groups'>('contacts');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);

  // Add Contact Form
  const [contactForm, setContactForm] = useState({
    name: '',
    phone: '',
    email: '',
    notes: '',
    groupIds: [] as string[],
  });

  // Group Form
  const [groupForm, setGroupForm] = useState({
    name: '',
    description: '',
    color: '#10b981',
  });

  // File Import
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importGroupId, setImportGroupId] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Native Contact Picker support check
  const [supportsNativePicker, setSupportsNativePicker] = useState(false);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (search) query.append('search', search);
      if (selectedGroup) query.append('groupId', selectedGroup);

      const res = await fetch(`/api/contacts?${query.toString()}`);
      const data = await res.json();
      setContacts(data.contacts || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    try {
      const res = await fetch('/api/groups');
      const data = await res.json();
      if (Array.isArray(data)) {
        setGroups(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadContacts();
    loadGroups();
    // Check Web Contact Picker API
    if (typeof window !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window) {
      setSupportsNativePicker(true);
    }
  }, [search, selectedGroup]);

  // Web Contact Picker API handler
  const handleNativeContactPicker = async () => {
    try {
      if (!('contacts' in navigator)) {
        alert('Bu cihaz veya tarayıcı Web Contact Picker API özelliğini desteklemiyor. Lütfen dosya yükleme seçeneğini kullanın.');
        return;
      }

      const props = ['name', 'tel', 'email'];
      const opts = { multiple: true };
      const selected = await (navigator as any).contacts.select(props, opts);

      if (Array.isArray(selected) && selected.length > 0) {
        const mapped = selected.map((item: any) => ({
          name: item.name?.[0] || 'Rehber Kişisi',
          phone: item.tel?.[0] || '',
          email: item.email?.[0] || '',
        }));

        setImporting(true);
        const res = await fetch('/api/contacts/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contacts: mapped, groupId: selectedGroup || undefined }),
        });
        const resData = await res.json();
        alert(resData.message || 'Kişiler başarıyla rehbere aktarıldı!');
        loadContacts();
      }
    } catch (err: any) {
      console.error('Contact picker error:', err);
    } finally {
      setImporting(false);
    }
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm),
      });
      const data = await res.json();
      if (res.ok) {
        setShowAddModal(false);
        setContactForm({ name: '', phone: '', email: '', notes: '', groupIds: [] });
        loadContacts();
      } else {
        alert(data.error || 'Kayıt sırasında hata oluştu.');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupForm),
      });
      if (res.ok) {
        setShowGroupModal(false);
        setGroupForm({ name: '', description: '', color: '#10b981' });
        loadGroups();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;

    setImporting(true);
    setImportStatus(null);

    try {
      const formData = new FormData();
      formData.append('file', importFile);
      if (importGroupId) formData.append('groupId', importGroupId);

      const res = await fetch('/api/contacts/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setImportStatus(`✅ ${data.message}`);
        setTimeout(() => {
          setShowImportModal(false);
          setImportFile(null);
          setImportStatus(null);
          loadContacts();
        }, 1500);
      } else {
        setImportStatus(`❌ ${data.error}`);
      }
    } catch (err: any) {
      setImportStatus(`❌ ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!confirm('Bu kişiyi silmek istediğinize emin misiniz?')) return;
    try {
      await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
      loadContacts();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111b21] border border-gray-800 rounded-3xl p-5 sm:p-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
              {total} Kayıtlı Kişi
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">Kişi & Grup Yönetimi</h1>
          <p className="text-xs text-gray-400">
            Rehberinizi yönetin, gruplara ayırın, Excel veya telefon rehberinizden aktarın.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mobile Contact Picker Button */}
          <button
            onClick={handleNativeContactPicker}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-semibold shadow-md transition-all"
            title="Cihaz rehberinden doğrudan kişi seçin"
          >
            <Smartphone className="w-4 h-4" />
            <span>Telefon Rehberinden Seç</span>
          </button>

          {/* Import File Button */}
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#202c33] hover:bg-[#2a3942] text-gray-200 text-xs font-semibold border border-gray-700 transition-all"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>vCard / Excel Yükle</span>
          </button>

          {/* Add Contact Button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Yeni Kişi</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
        <button
          onClick={() => setActiveTab('contacts')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'contacts' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white bg-[#202c33]/40'
          }`}
        >
          Kişiler ({total})
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'groups' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white bg-[#202c33]/40'
          }`}
        >
          Gruplar ({groups.length})
        </button>
      </div>

      {activeTab === 'contacts' ? (
        <>
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="İsim, telefon veya e-posta ile ara..."
                className="w-full bg-[#111b21] border border-gray-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="bg-[#111b21] border border-gray-800 rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">Tüm Gruplar</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g._count?.contacts || 0})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Contacts Table / Grid */}
          <div className="bg-[#111b21] border border-gray-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#202c33]/60 text-gray-400 font-semibold border-b border-gray-800">
                  <tr>
                    <th className="p-4">Kişi Adı</th>
                    <th className="p-4">Telefon Numarası</th>
                    <th className="p-4 hidden sm:table-cell">Gruplar</th>
                    <th className="p-4 hidden md:table-cell">E-Posta / Not</th>
                    <th className="p-4 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {contacts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-500">
                        {loading ? 'Yükleniyor...' : 'Kayıtlı kişi bulunamadı.'}
                      </td>
                    </tr>
                  ) : (
                    contacts.map((c) => (
                      <tr key={c.id} className="hover:bg-[#202c33]/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-800/80 flex items-center justify-center text-emerald-300 font-bold">
                              {c.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-white flex items-center gap-1.5">
                                <span>{c.name}</span>
                                {c.isBlacklisted && (
                                  <span className="px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 text-[10px]">
                                    Kara Liste
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 font-mono text-gray-300">
                          +{c.phone}
                        </td>
                        <td className="p-4 hidden sm:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {c.groups && c.groups.length > 0 ? (
                              c.groups.map((cg: any) => (
                                <span
                                  key={cg.groupId}
                                  className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                                >
                                  {cg.group?.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-500 text-[11px]">-</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 hidden md:table-cell text-gray-400">
                          <div>{c.email || '-'}</div>
                          {c.notes && <div className="text-[10px] text-gray-500 truncate max-w-xs">{c.notes}</div>}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleDeleteContact(c.id)}
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
                            title="Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Groups View */
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowGroupModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Yeni Grup Oluştur</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((g) => (
              <div key={g.id} className="p-5 rounded-3xl bg-[#111b21] border border-gray-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color || '#10b981' }} />
                      {g.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
                      {g._count?.contacts || 0} Kişi
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {g.description || 'Açıklama girilmemiş.'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-800/80 flex items-center justify-between text-xs">
                  <button
                    onClick={() => {
                      setSelectedGroup(g.id);
                      setActiveTab('contacts');
                    }}
                    className="text-emerald-400 hover:underline font-medium"
                  >
                    Kişileri Listele →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#111b21] border border-gray-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-emerald-400" />
              Yeni Kişi Ekle
            </h3>
            <form onSubmit={handleSaveContact} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Ad Soyad</label>
                <input
                  type="text"
                  required
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  placeholder="Örn: Ahmet Yılmaz"
                  className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Telefon Numarası</label>
                <input
                  type="text"
                  required
                  value={contactForm.phone}
                  onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                  placeholder="905xxxxxxxxx"
                  className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">E-Posta (İsteğe Bağlı)</label>
                <input
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  placeholder="ahmet@example.com"
                  className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Grup Seçimi</label>
                <select
                  multiple
                  value={contactForm.groupIds}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, option => option.value);
                    setContactForm({ ...contactForm, groupIds: selected });
                  }}
                  className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
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
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* File Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#111b21] border border-gray-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-400" />
              vCard (.vcf) veya Excel/CSV Yükle
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Apple/Android rehber dışa aktarımı (.vcf) veya Excel tablosunu (.xlsx, .csv) seçin.
            </p>

            {importStatus && (
              <div className="p-3 mb-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
                {importStatus}
              </div>
            )}

            <form onSubmit={handleFileUpload} className="space-y-4">
              <div className="border-2 border-dashed border-gray-700 rounded-2xl p-6 text-center hover:border-emerald-500 transition-colors">
                <FileSpreadsheet className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <input
                  type="file"
                  required
                  accept=".vcf,.vcard,.xlsx,.xls,.csv"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500"
                />
                {importFile && (
                  <p className="text-xs text-emerald-400 mt-2 font-medium">
                    Seçilen Dosya: {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Hedef Grup (İsteğe Bağlı)</label>
                <select
                  value={importGroupId}
                  onChange={(e) => setImportGroupId(e.target.value)}
                  className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Grup Seçmeyin (Varsayılan)</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-medium text-gray-300"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={importing || !importFile}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-bold text-white"
                >
                  {importing ? 'İçe Aktarılıyor...' : 'İçe Aktar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Group Create Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#111b21] border border-gray-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-emerald-400" />
              Yeni Kişi Grubu
            </h3>
            <form onSubmit={handleCreateGroup} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Grup Adı</label>
                <input
                  type="text"
                  required
                  value={groupForm.name}
                  onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                  placeholder="Örn: VIP Müşteriler"
                  className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Açıklama</label>
                <textarea
                  rows={2}
                  value={groupForm.description}
                  onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                  placeholder="Grubun kullanım amacı..."
                  className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGroupModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-medium text-gray-300"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white"
                >
                  Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
