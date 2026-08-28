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
  MoreVertical
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

export default function AdminUsersPage() {
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

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/');
    }
  }, [authLoading, isAdmin, router]);

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
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

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

      if (res.ok && data.success) {
        setStatusMsg({ type: 'success', text: `"${createForm.name}" kullanıcısı başarıyla oluşturuldu!` });
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
    if (targetUser.id === currentUser?.id) {
      alert('Kendi hesabınızı pasife alamazsınız.');
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !targetUser.isActive }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setUsers(users.map((u) => (u.id === targetUser.id ? { ...u, isActive: !u.isActive } : u)));
        setStatusMsg({
          type: 'success',
          text: `"${targetUser.name}" kullanıcısının durumu ${!targetUser.isActive ? 'Aktif' : 'Pasif'} olarak güncellendi.`,
        });
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Durum güncellenemedi.' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;

    if (newPassword.length < 6) {
      alert('Şifre en az 6 karakter olmalıdır.');
      return;
    }

    try {
      setUpdatingPassword(true);
      setStatusMsg(null);
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setStatusMsg({ type: 'success', text: `"${selectedUser.name}" kullanıcısının şifresi başarıyla güncellendi!` });
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
    if (targetUser.id === currentUser?.id) {
      alert('Kendi hesabınızı silemezsiniz.');
      return;
    }

    if (!window.confirm(`"${targetUser.name}" (${targetUser.email}) kullanıcısını kalıcı olarak silmek istediğinize emin misiniz?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setUsers(users.filter((u) => u.id !== targetUser.id));
        setStatusMsg({ type: 'success', text: `"${targetUser.name}" kullanıcısı başarıyla silindi.` });
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Kullanıcı silinemedi.' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (authLoading || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
          <span className="text-xs">Yetki doğrulanıyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111b21] border border-gray-800 rounded-3xl p-5 sm:p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 text-xs font-semibold border border-purple-500/20">
              Yönetici Paneli (RBAC)
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">Kullanıcı Yönetimi</h1>
          <p className="text-xs text-gray-400">
            Sisteme erişebilen kullanıcıları, rollerini ve hesap durumlarını yönetin.
          </p>
        </div>

        <button
          onClick={() => {
            setCreateModalOpen(true);
            setStatusMsg(null);
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Yeni Kullanıcı Ekle</span>
        </button>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-2xl text-xs font-medium border animate-fade-in ${
            statusMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#111b21] border border-gray-800 rounded-2xl p-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="İsim veya e-posta ile ara..."
            className="w-full bg-[#202c33] border border-gray-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <button
          onClick={fetchUsers}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-medium transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          <span>Yenile</span>
        </button>
      </div>

      {/* Users Table / Cards */}
      <div className="bg-[#111b21] border border-gray-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#202c33]/50 text-gray-400 uppercase tracking-wider font-semibold border-b border-gray-800">
              <tr>
                <th className="px-5 py-3.5">Kullanıcı</th>
                <th className="px-5 py-3.5">E-posta</th>
                <th className="px-5 py-3.5">Rol</th>
                <th className="px-5 py-3.5">Durum</th>
                <th className="px-5 py-3.5">Kayıt Tarihi</th>
                <th className="px-5 py-3.5 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
                    Kullanıcılar yükleniyor...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-500">
                    Kullanıcı bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrent = u.id === currentUser?.id;
                  const isAdminRole = u.role === 'ADMIN';

                  return (
                    <tr key={u.id} className="hover:bg-[#202c33]/30 transition-colors">
                      {/* Name */}
                      <td className="px-5 py-4 font-semibold text-white">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${
                            isAdminRole
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}>
                            {u.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {isCurrent && (
                                <span className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.2 rounded border border-gray-700 font-normal">
                                  Siz
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-5 py-4 text-gray-300 font-mono">
                        {u.email}
                      </td>

                      {/* Role */}
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          isAdminRole
                            ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                            : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                        }`}>
                          {isAdminRole ? (
                            <>
                              <ShieldCheck className="w-3 h-3 text-purple-400" />
                              YÖNETİCİ (ADMIN)
                            </>
                          ) : (
                            <>
                              <User className="w-3 h-3 text-blue-400" />
                              STANDART (USER)
                            </>
                          )}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <button
                          onClick={() => handleToggleActive(u)}
                          disabled={isCurrent}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-colors ${
                            u.isActive
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                              : 'bg-rose-500/15 text-rose-400 border-rose-500/30 hover:bg-rose-500/25'
                          } ${isCurrent ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
                          title={isCurrent ? 'Kendi hesabınızı değiştiremezsiniz' : 'Durumu Değiştir'}
                        >
                          {u.isActive ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              Aktif
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-rose-400" />
                              Pasif
                            </>
                          )}
                        </button>
                      </td>

                      {/* Date */}
                      <td className="px-5 py-4 text-gray-400">
                        {new Date(u.createdAt).toLocaleDateString('tr-TR')}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setNewPassword('');
                              setPasswordModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
                            title="Şifre Sıfırla / Güncelle"
                          >
                            <KeyRound className="w-4 h-4 text-amber-400" />
                          </button>

                          <button
                            onClick={() => handleDeleteUser(u)}
                            disabled={isCurrent}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              isCurrent
                                ? 'opacity-30 cursor-not-allowed bg-gray-800 text-gray-600 border-transparent'
                                : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20'
                            }`}
                            title={isCurrent ? 'Kendi hesabınızı silemezsiniz' : 'Kullanıcıyı Sil'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#111b21] border border-gray-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Yeni Kullanıcı Oluştur</h3>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-300 mb-1">Ad Soyad *</label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="Örn: Ahmet Yılmaz"
                  className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">E-posta Adresi *</label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="kullanici@whatspulse.com"
                  className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">Giriş Şifresi * (En az 6 karakter)</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">Kullanıcı Rolü *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, role: 'USER' })}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all ${
                      createForm.role === 'USER'
                        ? 'bg-blue-600/20 border-blue-500/50 text-blue-300 shadow-md'
                        : 'bg-[#202c33] border-gray-700 text-gray-400 hover:text-white'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    <span>Standart Kullanıcı</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, role: 'ADMIN' })}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all ${
                      createForm.role === 'ADMIN'
                        ? 'bg-purple-600/20 border-purple-500/50 text-purple-300 shadow-md'
                        : 'bg-[#202c33] border-gray-700 text-gray-400 hover:text-white'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Yönetici (Admin)</span>
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  {createForm.role === 'ADMIN'
                    ? 'Yönetici rolü tüm sistem ayarlarına, Evolution API yapılandırmasına ve kullanıcı yönetimine tam erişebilir.'
                    : 'Standart kullanıcı yalnızca mesajlaşma, rehber ve kampanya modüllerine erişebilir; ayarlar sekmesini göremez.'}
                </p>
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
                >
                  {creating ? 'Oluşturuluyor...' : 'Kullanıcıyı Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {passwordModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#111b21] border border-gray-700 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Şifre Sıfırla / Güncelle</h3>
              </div>
              <button
                onClick={() => setPasswordModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-4 text-xs">
              <div>
                <p className="text-gray-400 mb-1">
                  Kullanıcı: <strong className="text-white">{selectedUser.name}</strong> ({selectedUser.email})
                </p>
                <label className="block font-semibold text-gray-300 mb-1 mt-3">Yeni Şifre (En az 6 karakter)</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Yeni şifreyi giriniz"
                  className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={updatingPassword}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-600/20 transition-all disabled:opacity-50"
                >
                  {updatingPassword ? 'Kaydediliyor...' : 'Şifreyi Güncelle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
