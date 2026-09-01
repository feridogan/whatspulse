"use client";

import React, { useState, useEffect } from "react";
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
  Folder
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
      const res = await fetch("/api/subscribers?limit=500");
      const data = await res.json();
      if (data.success) {
        setOtherList(data.subscribers || []);
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
    const filteredOthers = otherList.filter(s => 
      s.name.toLowerCase().includes(rightSearch.toLowerCase()) || 
      s.phone.includes(rightSearch)
    );
    const addedIds = new Set(filteredOthers.map(s => s.id));
    setOtherList(prev => prev.filter(s => !addedIds.has(s.id)));
    setInGroupList(prev => [...prev, ...filteredOthers]);
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

  const filteredInGroup = inGroupList.filter(s => 
    s.name.toLowerCase().includes(leftSearch.toLowerCase()) || 
    s.phone.includes(leftSearch)
  );

  const filteredOthers = otherList.filter(s => 
    s.name.toLowerCase().includes(rightSearch.toLowerCase()) || 
    s.phone.includes(rightSearch)
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Sub-info banner (Section 5) */}
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
            SİSTEMDE TANIMLI OLAN VE ABONELERİ GRUPLANDIRDIĞINIZ ALANLARI YÖNETİN, ÇİFT PENCERELİ ATAMA PANELİ İLE ÜYELERİ DÜZENLEYİN.
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

      {/* Grup Listesi Tablosu (Section 5) */}
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
                {groups.map((g) => {
                  const count = g._count?.subscribers || g._count?.contacts || 0;
                  return (
                    <tr key={g.id} className="hover:bg-[#161a1d]/60 transition-colors">
                      {/* Grup Adı (Klasör ikonu ile tıklanabilir) */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleOpenEditGroup(g)}
                          className="flex items-center gap-2.5 text-left font-bold text-white hover:text-[#d4af37] transition-colors cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center text-[#d4af37]">
                            <Folder className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-serif-title">{g.name}</span>
                        </button>
                      </td>

                      {/* Açıklama */}
                      <td className="py-3.5 px-4 text-gray-400">
                        {g.description || <span className="italic text-gray-600">-</span>}
                      </td>

                      {/* Aktif Abone Sayısı: Mavi rozet (👤 X Aktif) */}
                      <td className="py-3.5 px-4 font-mono">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1 w-fit">
                          <span>👤</span> {count} Aktif
                        </span>
                      </td>

                      {/* Aksiyonlar: Uçak/Gönder, Kalem/Düzenle, Çöp Kutusu/Sil */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Toplu Mesaj At (Uçak) */}
                          <Link
                            href={`/chat?groupId=${g.id}`}
                            className="p-1.5 rounded-xl bg-[#10b981]/10 hover:bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/25 transition-all cursor-pointer"
                            title="Gruba Toplu Mesaj Gönder"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </Link>

                          {/* Düzenle (Kalem) */}
                          <button
                            onClick={() => handleOpenEditGroup(g)}
                            className="p-1.5 rounded-xl bg-[#181c1f] hover:bg-[#202529] text-gray-300 border border-[#2e353c] transition-all cursor-pointer"
                            title="Çift Pencerede Düzenle"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Sil (Çöp Kutusu) */}
                          <button
                            onClick={() => handleDeleteGroup(g.id, g.name)}
                            className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all cursor-pointer"
                            title="Sil"
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

      {/* "YENİ GRUP TANIMLA" Çift Pencereli Modal (Section 5) */}
      {showDualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-[#121517] border border-[#23292e] rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#23292e]">
              <div className="flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-[#d4af37]" />
                <h3 className="text-base font-bold text-white font-serif-title">
                  {editingGroup ? "Grup ve Abone Atamasını Düzenle" : "YENİ GRUP TANIMLA"}
                </h3>
              </div>
              <button onClick={() => setShowDualModal(false)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Üst Alan: GRUP ADI ve AÇIKLAMA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1 font-serif-title">GRUP ADI *</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Sabah Ayeti Takipçileri"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full bg-[#181c1f] border border-[#2e353c] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1 font-serif-title">AÇIKLAMA</label>
                <input
                  type="text"
                  placeholder="Grup hakkında kısa açıklama..."
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  className="w-full bg-[#181c1f] border border-[#2e353c] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                />
              </div>
            </div>

            {/* ÇİFT PENCERE (DUAL WINDOW) MİMARİSİ */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[340px] overflow-hidden">
              {/* SOL PENCERE: "✓ Bu Gruptaki Aboneler (X)" */}
              <div className="p-3.5 rounded-2xl bg-[#161a1d] border border-[#10b981]/30 flex flex-col space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#10b981] font-serif-title">
                    <span>✓ Bu Gruptaki Aboneler ({inGroupList.length})</span>
                  </div>
                  <span className="text-[10px] text-gray-400">Grupta Kayıtlı</span>
                </div>

                {/* Search in Left Window */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    placeholder="🔍 Gruptakilerde ara (İsim / Tel)..."
                    value={leftSearch}
                    onChange={(e) => setLeftSearch(e.target.value)}
                    className="w-full bg-[#181c1f] border border-[#2e353c] rounded-lg pl-8 pr-2 py-1 text-xs text-white focus:outline-none focus:border-[#10b981]"
                  />
                </div>

                {/* Left List + Gruptan Çıkar Button */}
                <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-1 max-h-60">
                  {modalLoading ? (
                    <div className="p-6 text-center text-xs text-gray-500">Yükleniyor...</div>
                  ) : filteredInGroup.length === 0 ? (
                    <div className="p-6 text-center text-xs text-gray-500 italic">
                      Bu grupta henüz abone yok. Sağ pencereden ekleyebilirsiniz.
                    </div>
                  ) : (
                    filteredInGroup.map((sub) => (
                      <div
                        key={sub.id}
                        className="p-2 rounded-xl bg-[#181c1f] border border-[#2e353c] flex items-center justify-between text-xs hover:border-[#10b981]/40 transition-colors"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-bold text-white truncate">{sub.name}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{sub.phone}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubscriber(sub)}
                          className="px-2 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-[10px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          <UserMinus className="w-3 h-3" />
                          <span>Gruptan Çıkar</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* SAĞ PENCERE: "👥 Diğer Aboneler (Y)" */}
              <div className="p-3.5 rounded-2xl bg-[#161a1d] border border-[#23292e] flex flex-col space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-300 font-serif-title">
                    <span>👥 Diğer Aboneler ({otherList.length})</span>
                  </div>
                  {/* Sağ Üst: "Tümünü Ekle" butonu */}
                  <button
                    type="button"
                    onClick={handleAddAll}
                    disabled={otherList.length === 0}
                    className="text-[10px] text-[#d4af37] hover:text-[#e5c158] font-bold disabled:opacity-40 cursor-pointer"
                  >
                    Tümünü Ekle
                  </button>
                </div>

                {/* Search in Right Window */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    placeholder="🔍 Diğer abonelerde ara..."
                    value={rightSearch}
                    onChange={(e) => setRightSearch(e.target.value)}
                    className="w-full bg-[#181c1f] border border-[#2e353c] rounded-lg pl-8 pr-2 py-1 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                  />
                </div>

                {/* Right List + Yeşil [← Ekle] button */}
                <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-1 max-h-60">
                  {modalLoading ? (
                    <div className="p-6 text-center text-xs text-gray-500">Yükleniyor...</div>
                  ) : filteredOthers.length === 0 ? (
                    <div className="p-6 text-center text-xs text-gray-500 italic">
                      Eklenebilecek başka abone kalmadı.
                    </div>
                  ) : (
                    filteredOthers.map((sub) => (
                      <div
                        key={sub.id}
                        className="p-2 rounded-xl bg-[#181c1f] border border-[#2e353c] flex items-center justify-between text-xs hover:border-[#d4af37]/40 transition-colors"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-bold text-white truncate">{sub.name}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{sub.phone}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddSubscriber(sub)}
                          className="px-2.5 py-1 rounded-lg bg-[#10b981] hover:bg-[#059669] text-white text-[10px] font-bold flex items-center gap-1 shrink-0 cursor-pointer shadow-sm"
                        >
                          <ArrowLeft className="w-3 h-3" />
                          <span>← Ekle</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Alt Bar: [İptal] ve [Grubu ve X Aboneyi Kaydet] (Yeşil Buton) */}
            <div className="flex items-center justify-between pt-3 border-t border-[#23292e]">
              <span className="text-xs text-gray-400 font-serif">
                Gruba Toplam: <strong className="text-[#10b981]">{inGroupList.length} Abone</strong> atanacak.
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDualModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#181c1f] hover:bg-[#202529] text-xs font-semibold text-gray-300 cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleSaveDualGroup}
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-[#10b981] hover:bg-[#059669] text-white text-xs font-black shadow-lg shadow-[#10b981]/20 cursor-pointer"
                >
                  {saving ? "Kaydediliyor..." : `Grubu ve ${inGroupList.length} Aboneyi Kaydet`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
