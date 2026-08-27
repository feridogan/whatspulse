'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  MessageSquare, 
  Send, 
  Search, 
  Paperclip, 
  FileText, 
  Check, 
  CheckCheck, 
  ArrowLeft, 
  MoreVertical, 
  ShieldAlert, 
  ShieldCheck, 
  RefreshCw,
  Image as ImageIcon,
  User
} from 'lucide-react';

function InboxContent() {
  const searchParams = useSearchParams();
  const initialPhone = searchParams?.get('phone') || '';

  const [chats, setChats] = useState<any[]>([]);
  const [activePhone, setActivePhone] = useState<string>(initialPhone);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [showMediaInput, setShowMediaInput] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadChats = async () => {
    try {
      const res = await fetch(`/api/inbox/chats?search=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setChats(data);
        if (!activePhone && data.length > 0) {
          setActivePhone(data[0].phone);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadMessages = async (phone: string) => {
    if (!phone) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/inbox/chats/${encodeURIComponent(phone)}/messages`);
      const data = await res.json();
      setActiveChat(data);
      setMessages(data.messages || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      if (Array.isArray(data)) {
        setTemplates(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && !mediaUrl.trim()) || !activePhone || sending) return;

    const text = inputText;
    const media = mediaUrl;
    setInputText('');
    setMediaUrl('');
    setShowMediaInput(false);
    setSending(true);

    try {
      const res = await fetch(`/api/inbox/chats/${encodeURIComponent(activePhone)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: text,
          mediaUrl: media || undefined,
          mediaType: media ? 'image' : 'text',
        }),
      });

      if (res.ok) {
        loadMessages(activePhone);
        loadChats();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleToggleBlacklist = async () => {
    if (!activePhone) return;
    const isCurrentlyBlacklisted = activeChat?.contact?.isBlacklisted;

    try {
      if (isCurrentlyBlacklisted) {
        await fetch(`/api/blacklist?phone=${encodeURIComponent(activePhone)}`, { method: 'DELETE' });
      } else {
        await fetch('/api/blacklist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: activePhone, reason: 'Sohbet ekranından engellendi' }),
        });
      }
      loadMessages(activePhone);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadChats();
    loadTemplates();
    const interval = setInterval(loadChats, 10000);
    return () => clearInterval(interval);
  }, [searchQuery]);

  useEffect(() => {
    if (activePhone) {
      loadMessages(activePhone);
      const interval = setInterval(() => loadMessages(activePhone), 6000);
      return () => clearInterval(interval);
    }
  }, [activePhone]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isContactBlacklisted = activeChat?.contact?.isBlacklisted;

  return (
    <div className="h-[calc(100vh-140px)] md:h-[calc(100vh-110px)] flex bg-[#111b21] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl relative">
      {/* Left Column: Chats List (Hidden on mobile when chat is active) */}
      <div className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-gray-800 bg-[#111b21] shrink-0 ${
        activePhone ? 'hidden md:flex' : 'flex'
      }`}>
        {/* Search Header */}
        <div className="p-3.5 border-b border-gray-800 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              Sohbetler
            </h2>
            <button
              onClick={loadChats}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sohbet veya kişi ara..."
              className="w-full bg-[#202c33] border border-gray-700/60 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Chats List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-800/40">
          {chats.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-xs">
              Sohbet bulunamadı.
            </div>
          ) : (
            chats.map((chat) => {
              const isSelected = activePhone === chat.phone;
              return (
                <button
                  key={chat.id}
                  onClick={() => setActivePhone(chat.phone)}
                  className={`w-full text-left p-3.5 flex items-center justify-between gap-3 transition-colors ${
                    isSelected ? 'bg-[#202c33]' : 'hover:bg-[#202c33]/50'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {(chat.contactName || chat.phone).charAt(0).toUpperCase()}
                    </div>
                    <div className="overflow-hidden">
                      <div className="font-semibold text-xs text-white truncate">
                        {chat.contactName || `+${chat.phone}`}
                      </div>
                      <div className="text-[11px] text-gray-400 truncate mt-0.5">
                        {chat.lastMessage || 'Medya iletildi'}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[10px] text-gray-500">
                      {chat.lastMessageTime ? new Date(chat.lastMessageTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                    {chat.unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Chat View */}
      <div className={`flex-1 flex flex-col bg-[#0b141a] ${
        !activePhone ? 'hidden md:flex items-center justify-center' : 'flex'
      }`}>
        {!activePhone ? (
          <div className="text-center p-8 text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Görüşmeyi başlatmak için soldan bir sohbet seçin.</p>
          </div>
        ) : (
          <>
            {/* Chat Top Bar */}
            <div className="p-3 bg-[#111b21] border-b border-gray-800 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                {/* Mobile Back Button */}
                <button
                  onClick={() => setActivePhone('')}
                  className="md:hidden p-1.5 rounded-lg text-gray-400 hover:text-white"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="w-9 h-9 rounded-full bg-emerald-700 flex items-center justify-center text-white font-bold text-xs">
                  {(activeChat?.chat?.contactName || activePhone).charAt(0).toUpperCase()}
                </div>

                <div>
                  <div className="font-bold text-xs sm:text-sm text-white flex items-center gap-2">
                    <span>{activeChat?.chat?.contactName || `+${activePhone}`}</span>
                    {isContactBlacklisted && (
                      <span className="px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 text-[10px] border border-red-500/30">
                        Kara Liste
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-400">+{activePhone}</div>
                </div>
              </div>

              {/* Chat Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleBlacklist}
                  title={isContactBlacklisted ? "Kara Listeden Çıkar" : "Kara Listeye Ekle (Opt-Out)"}
                  className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    isContactBlacklisted
                      ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                      : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                  }`}
                >
                  {isContactBlacklisted ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                  <span className="hidden sm:inline">
                    {isContactBlacklisted ? 'Engeli Kaldır' : 'Engelle'}
                  </span>
                </button>
              </div>
            </div>

            {/* Chat Timeline */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[radial-gradient(#202c33_1px,transparent_1px)] [background-size:16px_16px]">
              {messages.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-xs">
                  Henüz mesaj geçmişi yok. İlk mesajı siz gönderin!
                </div>
              ) : (
                messages.map((msg) => {
                  const isOutgoing = msg.sender === 'OUTGOING';

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3 shadow-md text-xs leading-relaxed ${
                        isOutgoing
                          ? 'bg-[#005c4b] text-white rounded-tr-none'
                          : 'bg-[#202c33] text-gray-100 rounded-tl-none'
                      }`}>
                        {/* Media image preview if any */}
                        {msg.mediaUrl && (
                          <div className="mb-2 rounded-xl overflow-hidden max-h-60 bg-black/40">
                            <img
                              src={msg.mediaUrl}
                              alt="Attachment"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        <p className="whitespace-pre-wrap select-text">{msg.content}</p>

                        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-gray-300/70">
                          <span>
                            {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                          {isOutgoing && (
                            <span>
                              {msg.status === 'READ' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />
                              ) : msg.status === 'DELIVERED' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-gray-300" />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-gray-400" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Template Selector Floating Menu */}
            {showTemplates && (
              <div className="p-3 bg-[#111b21] border-t border-gray-800 max-h-48 overflow-y-auto">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Hızlı Şablon Ekle:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {templates.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => {
                        setInputText(tpl.content);
                        if (tpl.mediaUrl) {
                          setMediaUrl(tpl.mediaUrl);
                          setShowMediaInput(true);
                        }
                        setShowTemplates(false);
                      }}
                      className="p-2 rounded-xl bg-[#202c33] hover:bg-[#2a3942] text-left text-xs text-gray-200 transition-colors"
                    >
                      <div className="font-semibold text-emerald-400">{tpl.name}</div>
                      <div className="text-[10px] text-gray-400 truncate">{tpl.content}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Media URL Input Drawer */}
            {showMediaInput && (
              <div className="p-3 bg-[#111b21] border-t border-gray-800 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                <input
                  type="url"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="Görsel / PDF Dosya Bağlantısı (URL)..."
                  className="flex-1 bg-[#202c33] border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={() => setShowMediaInput(false)}
                  className="text-xs text-gray-400 hover:text-white px-2"
                >
                  Kapat
                </button>
              </div>
            )}

            {/* Message Input Bottom Bar */}
            <form onSubmit={handleSendMessage} className="p-3 bg-[#111b21] border-t border-gray-800 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowTemplates(!showTemplates)}
                title="Şablon Seç"
                className="p-2.5 rounded-xl bg-[#202c33] hover:bg-[#2a3942] text-emerald-400 transition-colors"
              >
                <FileText className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setShowMediaInput(!showMediaInput)}
                title="Medya Ekle"
                className="p-2.5 rounded-xl bg-[#202c33] hover:bg-[#2a3942] text-gray-300 transition-colors"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Bir mesaj yazın..."
                className="flex-1 bg-[#202c33] border border-gray-700/80 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
              />

              <button
                type="submit"
                disabled={sending || (!inputText.trim() && !mediaUrl.trim())}
                className="p-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white shadow-md transition-all shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function InboxPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Yükleniyor...</div>}>
      <InboxContent />
    </Suspense>
  );
}
