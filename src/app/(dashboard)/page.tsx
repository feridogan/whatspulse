'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, 
  Send, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  MessageSquare, 
  FileText, 
  UserPlus, 
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  ShieldCheck,
  Smartphone
} from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    contactsCount: 0,
    groupsCount: 0,
    campaignsCount: 0,
    totalSent: 0,
    totalDelivered: 0,
    deliveryRate: '100.0',
  });
  const [recentCampaigns, setRecentCampaigns] = useState<any[]>([]);
  const [recentChats, setRecentChats] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Quick Send Modal State
  const [showQuickSend, setShowQuickSend] = useState(false);
  const [quickPhone, setQuickPhone] = useState('');
  const [quickMessage, setQuickMessage] = useState('');
  const [sendingQuick, setSendingQuick] = useState(false);
  const [quickResult, setQuickResult] = useState<string | null>(null);

  const loadData = async () => {
    try {
      // 1. Fetch Contacts count
      const contactsRes = await fetch('/api/contacts?limit=1');
      const contactsData = await contactsRes.json();

      // 2. Fetch Groups
      const groupsRes = await fetch('/api/groups');
      const groupsData = await groupsRes.json();

      // 3. Fetch Campaigns
      const campaignsRes = await fetch('/api/campaigns');
      const campaignsData = await campaignsRes.json();

      // 4. Fetch Message Stats
      const messagesRes = await fetch('/api/messages?limit=1');
      const messagesData = await messagesRes.json();

      // 5. Fetch Chats
      const chatsRes = await fetch('/api/inbox/chats');
      const chatsData = await chatsRes.json();

      setStats({
        contactsCount: contactsData.total || 0,
        groupsCount: Array.isArray(groupsData) ? groupsData.length : 0,
        campaignsCount: Array.isArray(campaignsData) ? campaignsData.length : 0,
        totalSent: messagesData.stats?.totalSent || 0,
        totalDelivered: messagesData.stats?.totalDelivered || 0,
        deliveryRate: messagesData.stats?.deliveryRate || '100.0',
      });

      if (Array.isArray(campaignsData)) {
        setRecentCampaigns(campaignsData.slice(0, 3));
      }

      if (Array.isArray(chatsData)) {
        setRecentChats(chatsData.slice(0, 4));
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    }
  };

  const handleSyncEvolution = async () => {
    try {
      setSyncing(true);
      setSyncMessage(null);
      const res = await fetch('/api/evolution/sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSyncMessage(`✅ Eşitleme Tamamlandı: ${data.synced?.contacts || 0} Kişi, ${data.synced?.groups || 0} Grup.`);
        loadData();
      } else {
        setSyncMessage(`❌ Hata: ${data.error}`);
      }
    } catch (err: any) {
      setSyncMessage(`❌ Bağlantı hatası: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleSendQuickMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingQuick(true);
    setQuickResult(null);

    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: quickPhone,
          content: quickMessage,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setQuickResult('✅ Mesaj başarıyla gönderildi!');
        setQuickPhone('');
        setQuickMessage('');
        loadData();
        setTimeout(() => setShowQuickSend(false), 1500);
      } else {
        setQuickResult(`❌ Hata: ${data.error}`);
      }
    } catch (err: any) {
      setQuickResult(`❌ Hata: ${err.message}`);
    } finally {
      setSendingQuick(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome & Quick Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[#111b21] to-[#14232c] border border-gray-800 rounded-3xl p-5 sm:p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
              Sistem Aktif
            </span>
            <span className="text-xs text-gray-400">sedat2 Instance</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">WhatsPulse Yönetim Paneli</h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Kişi rehberinizi yönetin, şablonlarla kişiselleştirilmiş toplu mesajlar iletin.
          </p>
        </div>

        {/* Quick Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleSyncEvolution}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#202c33] hover:bg-[#2a3942] text-white text-xs font-semibold border border-gray-700 transition-all shadow-md"
          >
            <RefreshCw className={`w-4 h-4 text-emerald-400 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Eşitleniyor...' : 'WhatsApp Senkronize Et'}</span>
          </button>

          <button
            onClick={() => setShowQuickSend(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all"
          >
            <Send className="w-4 h-4" />
            <span>Hızlı Mesaj Gönder</span>
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium animate-fade-in">
          {syncMessage}
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#111b21] border border-gray-800/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Toplam Kişi</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-white">{stats.contactsCount}</div>
            <div className="text-[11px] text-gray-400 mt-0.5">{stats.groupsCount} Farklı Grup</div>
          </div>
        </div>

        <div className="bg-[#111b21] border border-gray-800/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Toplam Gönderim</span>
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-white">{stats.totalSent}</div>
            <div className="text-[11px] text-gray-400 mt-0.5">{stats.campaignsCount} Kampanya</div>
          </div>
        </div>

        <div className="bg-[#111b21] border border-gray-800/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Teslimat Oranı</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-white">%{stats.deliveryRate}</div>
            <div className="text-[11px] text-gray-400 mt-0.5">{stats.totalDelivered} Başarılı İletim</div>
          </div>
        </div>

        <div className="bg-[#111b21] border border-gray-800/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Anti-Ban Durumu</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold text-emerald-400">Aktif & Güvenli</div>
            <div className="text-[11px] text-gray-400 mt-0.5">8 - 20 sn İnsansı Gecikme</div>
          </div>
        </div>
      </div>

      {/* Main 2-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Campaigns & Fast Access */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Campaigns Card */}
          <div className="bg-[#111b21] border border-gray-800 rounded-3xl p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-400" />
                <h2 className="text-base font-bold text-white">Son Kampanyalar ve Kuyruk</h2>
              </div>
              <Link href="/campaigns" className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-medium">
                Tümünü Gör <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentCampaigns.length === 0 ? (
              <div className="text-center py-8 bg-[#202c33]/30 rounded-2xl border border-gray-800">
                <Send className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-xs text-gray-400">Henüz başlatılmış bir kampanya yok.</p>
                <Link
                  href="/campaigns"
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold"
                >
                  İlk Kampanyayı Başlat
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentCampaigns.map((camp) => {
                  const progress = camp.totalCount > 0 ? Math.round(((camp.sentCount + camp.failedCount) / camp.totalCount) * 100) : 0;
                  return (
                    <div key={camp.id} className="p-4 rounded-2xl bg-[#202c33]/40 border border-gray-800/80 hover:border-gray-700 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="text-sm font-semibold text-white">{camp.title}</span>
                          <div className="text-[11px] text-gray-400">
                            {camp.sentCount} / {camp.totalCount} Mesaj İletildi
                          </div>
                        </div>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          camp.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' :
                          camp.status === 'PROCESSING' ? 'bg-amber-500/20 text-amber-400 animate-pulse' :
                          camp.status === 'PAUSED' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-700 text-gray-300'
                        }`}>
                          {camp.status === 'COMPLETED' ? 'Tamamlandı' :
                           camp.status === 'PROCESSING' ? 'Gönderiliyor' :
                           camp.status === 'PAUSED' ? 'Duraklatıldı' : camp.status}
                        </span>
                      </div>
                      {/* Progress Bar */}
                      <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Feature Navigation Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/contacts"
              className="p-5 rounded-3xl bg-[#111b21] border border-gray-800 hover:border-emerald-500/40 transition-all group"
            >
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 w-fit mb-3 group-hover:scale-105 transition-transform">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">Cihaz Rehberini İçe Aktar</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Telefonunuzdan tek tıkla kişi seçin veya .vcf / Excel dosyasından toplu yükleyin.
              </p>
            </Link>

            <Link
              href="/templates"
              className="p-5 rounded-3xl bg-[#111b21] border border-gray-800 hover:border-emerald-500/40 transition-all group"
            >
              <div className="p-3 rounded-2xl bg-teal-500/10 text-teal-400 w-fit mb-3 group-hover:scale-105 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">Dinamik Şablon Oluştur</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                &#123;isim&#125;, &#123;tarih&#125; gibi akıllı etiketler ve görsellerle kişiye özel mesaj hazırlayın.
              </p>
            </Link>
          </div>
        </div>

        {/* Right 1 Col: Recent Chats / Team Inbox Preview */}
        <div className="space-y-6">
          <div className="bg-[#111b21] border border-gray-800 rounded-3xl p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <h2 className="text-base font-bold text-white">Canlı Sohbetler</h2>
              </div>
              <Link href="/inbox" className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-medium">
                Gelen Kutusu <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentChats.length === 0 ? (
              <div className="text-center py-8 bg-[#202c33]/30 rounded-2xl border border-gray-800">
                <MessageSquare className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-xs text-gray-400">Henüz sohbet kaydı bulunmuyor.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentChats.map((chat) => (
                  <Link
                    key={chat.id}
                    href={`/inbox?phone=${encodeURIComponent(chat.phone)}`}
                    className="flex items-center justify-between p-3 rounded-2xl bg-[#202c33]/30 hover:bg-[#202c33]/70 border border-gray-800/60 transition-all"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-9 h-9 rounded-full bg-emerald-700 flex items-center justify-center text-white font-bold text-xs shrink-0">
                        {(chat.contactName || chat.phone).charAt(0).toUpperCase()}
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-xs font-semibold text-white truncate">
                          {chat.contactName || `+${chat.phone}`}
                        </div>
                        <div className="text-[11px] text-gray-400 truncate">
                          {chat.lastMessage || 'Medya mesajı'}
                        </div>
                      </div>
                    </div>

                    {chat.unreadCount > 0 && (
                      <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {chat.unreadCount}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fast Direct Message Modal */}
      {showQuickSend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#111b21] border border-gray-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-400" />
                Hızlı WhatsApp Mesajı Gönder
              </h3>
              <button
                onClick={() => setShowQuickSend(false)}
                className="text-gray-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendQuickMessage} className="space-y-4">
              {quickResult && (
                <div className={`p-3 rounded-xl text-xs font-medium ${
                  quickResult.startsWith('✅') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'
                }`}>
                  {quickResult}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Telefon Numarası (Örn: 905321234567)
                </label>
                <input
                  type="text"
                  required
                  value={quickPhone}
                  onChange={(e) => setQuickPhone(e.target.value)}
                  placeholder="905xxxxxxxxx"
                  className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Mesaj Metni
                </label>
                <textarea
                  rows={4}
                  required
                  value={quickMessage}
                  onChange={(e) => setQuickMessage(e.target.value)}
                  placeholder="Mesajınızı buraya yazın..."
                  className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuickSend(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-medium text-gray-300"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={sendingQuick}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-bold text-white flex items-center justify-center gap-1.5"
                >
                  {sendingQuick ? 'Gönderiliyor...' : 'Gönder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
