"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Layers, 
  Plus, 
  Search, 
  Users, 
  Edit3, 
  Trash2, 
  Send, 
  X, 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  RefreshCw,
  Sparkles,
  UserMinus,
  UserPlus
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
      // Fetch all subscribers to put into "Other" list
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

  // Dual-Window actions
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

      // 1. If new group, create group first
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

      // 2. Save Dual-Window members
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
    if (!confirm(`"${name}" grubunu silmek istediğinize emin misiniz? (Gruptaki aboneler silinmez, sadece gruptan çıkarılır)`)) return;
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

  // Filter lists inside modal
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-[#111b21] border border-gray-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-xs font-bold border border-amber-500/30">
              Segmentasyon Modülü
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-1">Abone & Müşteri Grupları</h1>
          <p className="text-xs text-gray-400">
            Çift pencereli atama mimarisi ile müşterilerinizi VIP, Alan Adı, Bölge veya Özel kategorilere ayırın.
          </p>
        </div>

        <button
          onClick={handleOpenNewGroup}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-black" />
          <span>+ Yeni Grup Tanımla</span>
        </button>
      </div>

      {/* Groups List Table */}
      <div className="bg-[#111b21] border border-gray-800 rounded-3xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-gray-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-400" />
            <p className="text-xs">Gruplar listeleniyor...</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="p-12 text-center text-gray-500 space-y-3">
            <Layers className="w-12 h-12 mx-auto opacity-30 text-amber-400" />
            <h3 className="text-sm font-bold text-gray-300">Henüz Grup Oluşturulmadı</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Yukarıdaki "+ Yeni Grup Tanımla" butonuna basarak ilk müşteri grubunuzu oluşturabilirsiniz.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-[#16222b] text-[11px] uppercase tracking-wider text-gray-400 border-b border-gray-800 font-mono">
                <tr>
                  <th className="py-3 px-4">Grup Adı</th>
                  <th className="py-3 px-4">Açıklama</th>
                  <th className="py-3 px-4">Aktif Abone Sayısı</th>
                  <th className="py-3 px-4 text-right">Aksiyonlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 font-sans">
                {groups.map((g) => {
                  const count = g._count?.subscribers || g._count?.contacts || 0;
                  return (
                    <tr key={g.id} className="hover:bg-[#16222b]/50 transition-colors">
                      {/* Name */}
                      <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                          <Layers className="w-4 h-4" />
                        </div>
                        <span className="text-sm">{g.name}</span>
                      </td>

                      {/* Description */}
                      <td className="py-3.5 px-4 text-gray-400">
                        {g.description || <span className="italic text-gray-600">-</span>}
                      </td>

                      {/* Active Count Badge */}
                      <td className="py-3.5 px-4 font-mono">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          {count} Aktif Abone
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Bulk Message to Group */}
                          <Link
                            href={`/campaigns?groupId=${g.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 text-[11px] font-bold transition-all cursor-pointer"
                            title="Gruba Toplu Mesaj At"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Toplu Mesaj</span>
                          </Link>

                          {/* Edit (Dual Window) */}
                          <button
                            onClick={() => handleOpenEditGroup(g)}
                            className="p-1.5 rounded-xl bg-[#202c33] hover:bg-[#2a3942] text-gray-300 border border-gray-700 transition-all cursor-pointer"
                            title="Çift Pencerede Düzenle"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
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

      {/* DUAL-WINDOW GROUP ASSIGNMENT MODAL (Görsel 4 Çift Pencere Mimarisi) */}
      {showDualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-[#111b21] border border-gray-800 rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">
                  {editingGroup ? "Grup ve Abone Atamasını Düzenle" : "Yeni Grup ve Çift Pencereli Abone Ataması"}
                </h3>
              </div>
              <button onClick={() => setShowDualModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Inputs: Group Name & Description */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Grup Adı *</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: VIP Domain Müşterileri"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Grup Açıklaması</label>
                <input
                  type="text"
                  placeholder="Grup hakkında kısa not..."
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* DUAL WINDOW CONTAINER */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[340px] overflow-hidden">
              {/* SOL PENCERE: Bu Gruptaki Aboneler */}
              <div className="p-3.5 rounded-2xl bg-[#16222b] border border-emerald-500/30 flex flex-col space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                    <Users className="w-4 h-4" />
                    <span>Bu Gruptaki Aboneler ({inGroupList.length})</span>
                  </div>
                  <span className="text-[10px] text-gray-400">Seçili Aboneler</span>
                </div>

                {/* Search in Left Window */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Grup içi ara..."
                    value={leftSearch}
                    onChange={(e) => setLeftSearch(e.target.value)}
                    className="w-full bg-[#202c33] border border-gray-700 rounded-lg pl-8 pr-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Left List */}
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
                        className="p-2 rounded-xl bg-[#202c33] border border-gray-700 flex items-center justify-between text-xs hover:border-emerald-500/40 transition-colors"
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
                          <span>Çıkar</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* SAĞ PENCERE: Diğer Aboneler */}
              <div className="p-3.5 rounded-2xl bg-[#16222b] border border-gray-700 flex flex-col space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-300">
                    <Users className="w-4 h-4 text-amber-400" />
                    <span>Diğer Aboneler ({otherList.length})</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddAll}
                    disabled={otherList.length === 0}
                    className="text-[10px] text-amber-400 hover:text-amber-300 font-bold disabled:opacity-40 cursor-pointer"
                  >
                    Tümünü Ekle
                  </button>
                </div>

                {/* Search in Right Window */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Diğer abonelerde ara..."
                    value={rightSearch}
                    onChange={(e) => setRightSearch(e.target.value)}
                    className="w-full bg-[#202c33] border border-gray-700 rounded-lg pl-8 pr-2 py-1 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Right List */}
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
                        className="p-2 rounded-xl bg-[#202c33] border border-gray-700 flex items-center justify-between text-xs hover:border-amber-500/40 transition-colors"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-bold text-white truncate">{sub.name}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{sub.phone}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddSubscriber(sub)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 shrink-0 cursor-pointer shadow-sm"
                        >
                          <ArrowLeft className="w-3 h-3" />
                          <span>Ekle</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-800">
              <span className="text-xs text-gray-400">
                Gruba Toplam: <strong className="text-emerald-400">{inGroupList.length} Abone</strong> dahil edilecek.
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDualModal(false)}
                  className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-300 cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleSaveDualGroup}
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-black shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  {saving ? "Kaydediliyor..." : `Grubu ve ${inGroupList.length} Aboneliği Kaydet`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
