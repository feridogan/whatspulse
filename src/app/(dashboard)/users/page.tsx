'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  User, 
  KeyRound, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Search, 
  RefreshCw, 
  Mail, 
  AlertCircle,
  MoreVertical,
  Lock,
  X,
  Check,
  ShieldAlert
} from 'lucide-react';

interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export default function UsersPage() {
  const router = useRouter();
  const { user: currentUser, isAdmin, loading: authLoading } = useAuth();

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal States
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'USER' as 'ADMIN' | 'USER',
    isActive: true,
  });
  const [creating, setCreating] = useState(false);

  // Password Reset Modal
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      } else {
        const errData = await res.json();
        setStatusMsg({ type: 'error', text: errData.error || 'Kullanıcılar yüklenemedi.' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name || !createForm.email || !createForm.password) {
      setStatusMsg({ type: 'error', text: 'Tüm zorunlu alanları doldurunuz.' });
      return;
    }

    try {
      setCreating(true);
      setStatusMsg(null);
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });

      const data = await res.json();
      if (res.ok) {
        setStatusMsg({ type: 'success', text: `"${createForm.name}" kullanıcısı başarıyla eklendi.` });
        setCreateModalOpen(false);
        setCreateForm({
          name: '',
          email: '',
          password: '',
          role: 'USER',
          isActive: true,
        });
        fetchUsers();
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Kullanıcı oluşturulamadı.' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (targetUser: ManagedUser) => {
    try {
      setStatusMsg(null);
      const res = await fetch(`/api/admin/users/${targetUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !targetUser.isActive }),
      });

      const data = await res.json();
      if (res.ok) {
        setUsers(users.map(u => u.id === targetUser.id ? { ...u, isActive: !u.isActive } : u));
        setStatusMsg({
          type: 'success',
          text: `"${targetUser.name}" kullanıcısı ${!targetUser.isActive ? 'aktif edildi' : 'pasife alındı'}.`,
        });
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Durum güncellenemedi.' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;

    try {
      setUpdatingPassword(true);
      setStatusMsg(null);
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });

      const data = await res.json();
      if (res.ok) {
        setStatusMsg({ type: 'success', text: `"${selectedUser.name}" kullanıcısının şifresi başarıyla güncellendi.` });
        setPasswordModalOpen(false);
        setNewPassword('');
        setSelectedUser(null);
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Şifre güncellenemedi.' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleDeleteUser = async (targetUser: ManagedUser) => {
    if (!confirm(`"${targetUser.name}" (${targetUser.email}) kullanıcısını kalıcı olarak silmek istediğinize emin misiniz?`)) {
      return;
    }

    try {
      setStatusMsg(null);
      const res = await fetch(`/api/admin/users/${targetUser.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (res.ok) {
        setUsers(users.filter(u => u.id !== targetUser.id));
        setStatusMsg({ type: 'success', text: `"${targetUser.name}" kullanıcısı sistemden silindi.` });
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Kullanıcı silinemedi.' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-[#121517] border border-[#23292e] shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#d4af37]/15 text-[#d4af37] text-xs font-bold border border-[#d4af37]/30 font-serif-title">
              YETKİLENDİRME & GÜVENLİK
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-1 font-serif-title">
            Kullanıcı & Giriş Yetkileri
          </h1>
          <p className="text-xs text-gray-400">
            WhatsPulse paneline erişebilecek yöneticileri ve operatörleri tanımlayın, şifre ve durumlarını yönetin.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#10b981] hover:from-[#e5c158] hover:to-[#059669] text-black font-extrabold text-xs shadow-lg shadow-[#d4af37]/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4 text-black" />
          <span>+ Yeni Kullanıcı Ekle</span>
        </button>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-bold shadow-md ${
          statusMsg.type === 'success'
            ? 'bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30'
            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="p-4 rounded-2xl bg-[#121517] border border-[#23292e] flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="🔍 İsim veya e-posta ile ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#181c1f] border border-[#2e353c] rounded-xl pl-9 pr-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37]"
          />
        </div>

        <button
          onClick={fetchUsers}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#181c1f] hover:bg-[#202529] text-gray-300 border border-[#2e353c] text-xs font-bold cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#d4af37]' : ''}`} />
          <span>Yenile</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-[#121517] border border-[#23292e] rounded-3xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-12 text-center text-gray-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#d4af37]" />
            <p className="text-xs">Kullanıcılar yükleniyor...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-gray-500 space-y-3">
            <Users className="w-12 h-12 mx-auto opacity-30 text-[#d4af37]" />
            <h3 className="text-sm font-bold text-gray-300 font-serif-title">Kullanıcı Bulunamadı</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Arama kriterlerinize uyan kullanıcı yok veya henüz eklenmedi.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-[#161a1d] text-[11px] uppercase tracking-wider text-gray-400 border-b border-[#23292e] font-serif-title">
                <tr>
                  <th className="py-3.5 px-4">KULLANICI (İSİM & E-POSTA)</th>
                  <th className="py-3.5 px-4">ROL / YETKİ</th>
                  <th className="py-3.5 px-4">DURUM</th>
                  <th className="py-3.5 px-4">KAYIT TARİHİ</th>
                  <th className="py-3.5 px-4 text-right">AKSİYONLAR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#23292e]/60 font-sans">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-[#161a1d]/60 transition-colors">
                    {/* User name & email */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#d4af37]/20 to-[#10b981]/20 border border-[#d4af37]/30 flex items-center justify-center text-xs font-bold text-[#d4af37] font-mono shrink-0">
                          {u.name ? u.name.slice(0, 2).toUpperCase() : "US"}
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{u.name}</span>
                            {currentUser?.email === u.email && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                Siz
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-400 font-mono flex items-center gap-1">
                            <Mail className="w-3 h-3 text-gray-500" />
                            <span>{u.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4">
                      {u.role === 'ADMIN' ? (
                        <span className="px-2.5 py-1 rounded-full bg-[#d4af37]/15 text-[#d4af37] border border-[#d4af37]/30 text-[10px] font-bold flex items-center gap-1 w-fit">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Yönetici / Admin</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 text-[10px] font-bold flex items-center gap-1 w-fit">
                          <User className="w-3.5 h-3.5" />
                          <span>Operatör / User</span>
                        </span>
                      )}
                    </td>

                    {/* Status Toggle */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleActive(u)}
                        disabled={currentUser?.email === u.email}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50 ${
                          u.isActive
                            ? 'bg-[#10b981]/15 text-[#10b981] border-[#10b981]/30 hover:bg-[#10b981]/25'
                            : 'bg-rose-500/15 text-rose-400 border-rose-500/30 hover:bg-rose-500/25'
                        }`}
                      >
                        {u.isActive ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Aktif</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" />
                            <span>Pasif</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Created at */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-gray-400">
                      {new Date(u.createdAt).toLocaleDateString('tr-TR')}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setPasswordModalOpen(true);
                          }}
                          className="p-1.5 rounded-xl bg-[#181c1f] hover:bg-[#202529] text-[#d4af37] border border-[#2e353c] transition-all cursor-pointer"
                          title="Şifre Sıfırla"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteUser(u)}
                          disabled={currentUser?.email === u.email}
                          className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all cursor-pointer disabled:opacity-30"
                          title="Kullanıcıyı Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* YENİ KULLANICI EKLE MODALI */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-[#121517] border border-[#23292e] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#23292e]">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#d4af37]" />
                <h3 className="text-base font-bold text-white font-serif-title">
                  Yeni Kullanıcı Tanımla
                </h3>
              </div>
              <button onClick={() => setCreateModalOpen(false)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1 font-serif-title">Ad Soyad *</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Feridun Doğan"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full bg-[#181c1f] border border-[#2e353c] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1 font-serif-title">E-Posta / Kullanıcı Adı *</label>
                <input
                  type="email"
                  required
                  placeholder="admin@whatspulse.com"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full bg-[#181c1f] border border-[#2e353c] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1 font-serif-title">Giriş Şifresi *</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full bg-[#181c1f] border border-[#2e353c] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1 font-serif-title">Kullanıcı Rolü *</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as any })}
                  className="w-full bg-[#181c1f] border border-[#2e353c] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37] cursor-pointer"
                >
                  <option value="ADMIN">Yönetici (Tam Yetkili)</option>
                  <option value="USER">Operatör (Mesajlaşma & Rehber)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#23292e]">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#181c1f] text-xs font-semibold text-gray-300 cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#10b981] hover:from-[#e5c158] hover:to-[#059669] text-black text-xs font-black shadow-lg shadow-[#d4af37]/20 cursor-pointer"
                >
                  {creating ? "Ekleniyor..." : "Kullanıcıyı Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ŞİFRE SIFIRLAMA MODALI */}
      {passwordModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-[#121517] border border-[#23292e] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#23292e]">
              <div className="flex items-center gap-2 text-[#d4af37]">
                <KeyRound className="w-5 h-5" />
                <h3 className="text-base font-bold text-white font-serif-title">
                  Şifre Sıfırla: {selectedUser.name}
                </h3>
              </div>
              <button onClick={() => setPasswordModalOpen(false)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1 font-serif-title">Yeni Şifre *</label>
                <input
                  type="password"
                  required
                  placeholder="En az 6 karakter..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-[#181c1f] border border-[#2e353c] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#23292e]">
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#181c1f] text-xs font-semibold text-gray-300 cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={updatingPassword}
                  className="px-5 py-2 rounded-xl bg-[#d4af37] hover:bg-[#e5c158] text-black text-xs font-black shadow-lg cursor-pointer"
                >
                  {updatingPassword ? "Güncelleniyor..." : "Şifreyi Güncelle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
