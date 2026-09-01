"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  FolderTree, 
  Plus, 
  Search, 
  Users, 
  Edit3, 
  Trash2, 
  Send, 
  X, 
  ArrowLeft, 
  Check, 
  RefreshCw,
  Sparkles,
  UserMinus,
  Folder,
  UserPlus,
  ArrowRight
} from "lucide-react";

export default function GroupsPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDualModal, setShowDualModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Dual Window State
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [inGroupList, setInGroupList] = useState<any[]>([]);
  const [otherList, setOtherList] = useState<any[]>([]);
  const [leftSearch, setLeftSearch] = useState("");
  const [rightSearch, setRightSearch] = useState("");
  const [modalLoading, setModalLoading] = useState(false);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/groups");
      const data = await res.json();
      if (Array.isArray(data)) setGroups(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const handleOpenNewGroup = async () => {
    setEditingGroup(null);
    setGroupName("");
    setGroupDesc("");
    setInGroupList([]);
    setLeftSearch("");
    setRightSearch("");
    setShowDualModal(true);
    setModalLoading(true);

    try {
      // Fetch ALL subscribers (no 500 limit)
      const res = await fetch("/api/subscribers?limit=10000");
      const data = await res.json();
      if (data.success && Array.isArray(data.subscribers)) {
        setOtherList(data.subscribers);
      } else {
        // Fallback to contacts API
        const cRes = await fetch("/api/contacts?limit=10000");
        const cData = await cRes.json();
        if (Array.isArray(cData.contacts)) {
          setOtherList(cData.contacts);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleOpenEditGroup = async (g: any) => {
    setEditingGroup(g);
    setGroupName(g.name);
    setGroupDesc(g.description || "");
    setLeftSearch("");
    setRightSearch("");
    setShowDualModal(true);
    setModalLoading(true);

    try {
      const res = await fetch(`/api/groups/${g.id}/subscribers`);
      const data = await res.json();
      if (data.success) {
        setInGroupList(data.inGroupSubscribers || []);
        setOtherList(data.otherSubscribers || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleAddSubscriber = (sub: any) => {
    setOtherList(prev => prev.filter(s => s.id !== sub.id));
    setInGroupList(prev => [...prev, sub]);
  };

  const handleRemoveSubscriber = (sub: any) => {
    setInGroupList(prev => prev.filter(s => s.id !== sub.id));
    setOtherList(prev => [...prev, sub]);
  };

  const handleAddAll = () => {
    const q = rightSearch.toLowerCase().trim();
    const matches = otherList.filter(s => {
      if (!q) return true;
      return (
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.phone && s.phone.includes(q)) ||
        (s.company && s.company.toLowerCase().includes(q))
      );
    });

    const addedIds = new Set(matches.map(s => s.id));
    setOtherList(prev => prev.filter(s => !addedIds.has(s.id)));
    setInGroupList(prev => [...prev, ...matches]);
  };

  const handleRemoveAll = () => {
    const q = leftSearch.toLowerCase().trim();
    const matches = inGroupList.filter(s => {
      if (!q) return true;
      return (
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.phone && s.phone.includes(q)) ||
        (s.company && s.company.toLowerCase().includes(q))
      );
    });

    const removedIds = new Set(matches.map(s => s.id));
    setInGroupList(prev => prev.filter(s => !removedIds.has(s.id)));
    setOtherList(prev => [...prev, ...matches]);
  };

  const handleSaveDualGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      alert("Lütfen grup adı giriniz.");
      return;
    }

    setSaving(true);
    try {
      let targetGroupId = editingGroup?.id;

      if (!targetGroupId) {
        const createRes = await fetch("/api/groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: groupName.trim(),
            description: groupDesc.trim() || undefined
          })
        });
        const createData = await createRes.json();
        if (!createRes.ok || !createData.id) {
          alert(createData.error || "Grup oluşturulamadı.");
          setSaving(false);
          return;
        }
        targetGroupId = createData.id;
      }

      const memberRes = await fetch(`/api/groups/${targetGroupId}/subscribers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: groupName.trim(),
          description: groupDesc.trim() || undefined,
          subscriberIds: inGroupList.map(s => s.id)
        })
      });

      const memberData = await memberRes.json();
      if (memberData.success) {
        setShowDualModal(false);
        loadGroups();
      } else {
        alert(memberData.error || "Aboneler kaydedilemedi.");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async (id: string, name: string) => {
    if (!confirm(`"${name}" grubunu silmek istediğinize emin misiniz?`)) return;
    try {
      const res = await fetch(`/api/groups/${id}`, { method: "DELETE" });
      if (res.ok) {
        loadGroups();
      } else {
        alert("Grup silinemedi.");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Instant client-side memoized filters for high performance with 1,800+ records
  const filteredInGroup = useMemo(() => {
    const q = leftSearch.toLowerCase().trim();
    if (!q) return inGroupList;
    return inGroupList.filter(s => 
      (s.name && s.name.toLowerCase().includes(q)) || 
      (s.phone && s.phone.includes(q)) ||
      (s.company && s.company.toLowerCase().includes(q))
    );
  }, [inGroupList, leftSearch]);

  const filteredOthers = useMemo(() => {
    const q = rightSearch.toLowerCase().trim();
    if (!q) return otherList;
    return otherList.filter(s => 
      (s.name && s.name.toLowerCase().includes(q)) || 
      (s.phone && s.phone.includes(q)) ||
      (s.company && s.company.toLowerCase().includes(q))
    );
  }, [otherList, rightSearch]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Sub-info banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-[#121517] border border-[#23292e] shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#d4af37]/15 text-[#d4af37] text-xs font-bold border border-[#d4af37]/30 font-serif-title">
              GRUP SEGMENTASYONU
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-1 font-serif-title">
            Grup Yönetimi
          </h1>
          <p className="text-xs text-gray-400 max-w-2xl mt-1">
            Sistemde tanımlı olan ve aboneleri gruplandırdığınız alanları yönetin, çift pencereli atama paneli ile üyeleri düzenleyin.
          </p>
        </div>

        {/* Sağ Üst Buton: [+ Yeni Grup Ekle] */}
        <button
          onClick={handleOpenNewGroup}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#10b981] hover:from-[#e5c158] hover:to-[#059669] text-black font-extrabold text-xs shadow-lg shadow-[#d4af37]/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-black" />
          <span>+ Yeni Grup Ekle</span>
        </button>
      </div>

      {/* Grup Listesi Tablosu */}
      <div className="bg-[#121517] border border-[#23292e] rounded-3xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-12 text-center text-gray-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#d4af37]" />
            <p className="text-xs">Gruplar listeleniyor...</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="p-12 text-center text-gray-500 space-y-3">
            <FolderTree className="w-12 h-12 mx-auto opacity-30 text-[#d4af37]" />
            <h3 className="text-sm font-bold text-gray-300 font-serif-title">Henüz Grup Oluşturulmadı</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Yukarıdaki "+ Yeni Grup Ekle" butonuna basarak ilk abone grubunuzu oluşturabilirsiniz.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-[#161a1d] text-[11px] uppercase tracking-wider text-gray-400 border-b border-[#23292e] font-serif-title">
                <tr>
                  <th className="py-3.5 px-4">Grup Adı</th>
                  <th className="py-3.5 px-4">Açıklama</th>
                  <th className="py-3.5 px-4">Aktif Abone Sayısı</th>
                  <th className="py-3.5 px-4 text-right">Aksiyonlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#23292e]/60 font-sans">
                {groups.map((group) => {
                  const count = group._count?.subscribers || group._count?.contacts || 0;
                  return (
                    <tr key={group.id} className="hover:bg-[#161a1d]/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#d4af37]/20 to-[#10b981]/20 border border-[#d4af37]/30 flex items-center justify-center text-xs font-bold text-[#d4af37]">
                            <Folder className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-white text-xs sm:text-sm">
                            {group.name}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-gray-400 max-w-xs truncate">
                        {group.description || "—"}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30 flex items-center gap-1.5 w-fit">
                          <Users className="w-3.5 h-3.5" />
                          <span>{count} Aktif</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditGroup(group)}
                            className="p-1.5 rounded-xl bg-[#181c1f] hover:bg-[#202529] text-[#d4af37] border border-[#2e353c] transition-all cursor-pointer"
                            title="Çift Pencerede Düzenle"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteGroup(group.id, group.name)}
                            className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all cursor-pointer"
                            title="Grubu Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ÇİFT PENCERELİ GRUP TANIMLAMA & ATAMA MODALI */}
      {showDualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-[#121517] border border-[#23292e] rounded-3xl max-w-5xl w-full p-5 sm:p-6 shadow-2xl flex flex-col max-h-[92vh] space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#23292e]">
              <div className="flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-[#d4af37]" />
                <h3 className="text-base font-bold text-white font-serif-title uppercase tracking-wide">
                  {editingGroup ? `GRUP DÜZENLE: ${editingGroup.name}` : "YENİ GRUP TANIMLA"}
                </h3>
              </div>
              <button
                onClick={() => setShowDualModal(false)}
                className="p-1.5 rounded-xl bg-[#181c1f] text-gray-400 hover:text-white border border-[#2e353c] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Group Name & Desc inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1 font-serif-title">
                  GRUP ADI *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: VIP Müşteriler, Kurumsal Aboneler"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full bg-[#181c1f] border border-[#2e353c] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1 font-serif-title">
                  AÇIKLAMA / NOT
                </label>
                <input
                  type="text"
                  placeholder="Grup hakkında kısa açıklama..."
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  className="w-full bg-[#181c1f] border border-[#2e353c] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                />
              </div>
            </div>

            {/* DUAL WINDOW CONTAINER */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-[360px] max-h-[460px] overflow-hidden pt-1">
              {/* SOL PENCERE: BU GRUPTAKİ ABONELER */}
              <div className="bg-[#181c1f] border border-[#2e353c] rounded-2xl p-3 flex flex-col justify-between overflow-hidden shadow-inner">
                <div className="space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-[#2e353c]">
                    <span className="text-xs font-bold text-[#10b981] flex items-center gap-1.5 font-serif-title">
                      <Check className="w-4 h-4" />
                      <span>✓ BU GRUPTAKİ ABONELER ({filteredInGroup.length})</span>
                    </span>
                    {inGroupList.length > 0 && (
                      <button
                        type="button"
                        onClick={handleRemoveAll}
                        className="text-[10px] text-rose-400 hover:text-rose-300 hover:underline font-bold"
                      >
                        Tümünü Çıkar
                      </button>
                    )}
                  </div>

                  {/* Sol Arama Kutusu */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      placeholder="🔍 Gruptakilerde ara..."
                      value={leftSearch}
                      onChange={(e) => setLeftSearch(e.target.value)}
                      className="w-full bg-[#121517] border border-[#2e353c] rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#10b981]"
                    />
                  </div>
                </div>

                {/* Sol Liste Scroll Area */}
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 mt-2 max-h-[290px]">
                  {modalLoading ? (
                    <div className="p-8 text-center text-gray-400 space-y-2">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#10b981]" />
                      <p className="text-[11px]">Üyeler yükleniyor...</p>
                    </div>
                  ) : filteredInGroup.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 space-y-1">
                      <Users className="w-6 h-6 mx-auto opacity-30" />
                      <p className="text-xs">Bu grupta henüz abone yok.</p>
                      <p className="text-[10px] text-gray-400">Sağ taraftaki listeden "+ Ekle" butonuna basarak ekleyin.</p>
                    </div>
                  ) : (
                    filteredInGroup.map((sub) => (
                      <div
                        key={sub.id}
                        className="p-2 rounded-xl bg-[#121517] border border-[#23292e] flex items-center justify-between gap-2 hover:border-rose-500/40 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-white truncate">{sub.name}</div>
                          <div className="text-[10px] text-[#10b981] font-mono">{sub.phone}</div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveSubscriber(sub)}
                          className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0"
                          title="Gruptan Çıkar"
                        >
                          <UserMinus className="w-3 h-3" />
                          <span>Çıkar</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* SAĞ PENCERE: DİĞER ABONELER (TÜM LİSTE) */}
              <div className="bg-[#181c1f] border border-[#2e353c] rounded-2xl p-3 flex flex-col justify-between overflow-hidden shadow-inner">
                <div className="space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-[#2e353c]">
                    <span className="text-xs font-bold text-[#d4af37] flex items-center gap-1.5 font-serif-title">
                      <Users className="w-4 h-4" />
                      <span>👥 DİĞER ABONELER ({filteredOthers.length})</span>
                    </span>

                    {/* Sağ Üst: [Tümünü Ekle] Butonu */}
                    <button
                      type="button"
                      onClick={handleAddAll}
                      disabled={filteredOthers.length === 0}
                      className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#d4af37] to-[#10b981] hover:from-[#e5c158] hover:to-[#059669] text-black text-[10px] font-extrabold shadow-sm flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40"
                    >
                      <UserPlus className="w-3 h-3" />
                      <span>Tümünü Ekle ({filteredOthers.length})</span>
                    </button>
                  </div>

                  {/* Sağ Arama Kutusu */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      placeholder="🔍 Diğer abonelerde ara..."
                      value={rightSearch}
                      onChange={(e) => setRightSearch(e.target.value)}
                      className="w-full bg-[#121517] border border-[#2e353c] rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                </div>

                {/* Sağ Liste Scroll Area */}
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 mt-2 max-h-[290px]">
                  {modalLoading ? (
                    <div className="p-8 text-center text-gray-400 space-y-2">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#d4af37]" />
                      <p className="text-[11px]">Tüm rehber listesi getiriliyor...</p>
                    </div>
                  ) : filteredOthers.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 space-y-1">
                      <Check className="w-6 h-6 mx-auto text-[#10b981]" />
                      <p className="text-xs text-gray-400">Tüm aboneler bu gruba eklendi veya eşleşen kayıt bulunamadı.</p>
                    </div>
                  ) : (
                    filteredOthers.map((sub) => (
                      <div
                        key={sub.id}
                        className="p-2 rounded-xl bg-[#121517] border border-[#23292e] flex items-center justify-between gap-2 hover:border-[#10b981]/40 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                            <span>{sub.name}</span>
                            {sub.company && (
                              <span className="text-[10px] text-gray-500 font-normal truncate">({sub.company})</span>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono">{sub.phone}</div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAddSubscriber(sub)}
                          className="px-2 py-1 rounded-lg bg-[#10b981]/15 hover:bg-[#10b981]/25 text-[#10b981] border border-[#10b981]/30 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0"
                          title="Gruba Ekle"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+ Ekle</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer / Save Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-[#23292e]">
              <div className="text-xs text-gray-400">
                Gruptaki Üye Sayısı: <strong className="text-[#10b981] font-mono">{inGroupList.length}</strong> / Toplam Havuz: <span className="font-mono text-white">{inGroupList.length + otherList.length}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDualModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#181c1f] hover:bg-[#202529] text-xs font-semibold text-gray-300 border border-[#2e353c] cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleSaveDualGroup}
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#10b981] hover:from-[#e5c158] hover:to-[#059669] text-black text-xs font-black shadow-lg shadow-[#d4af37]/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <span>Kaydediliyor...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4 text-black" />
                      <span>Grubu ve Üyeleri Kaydet</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
