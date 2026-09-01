"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { 
  MessageSquare, 
  Send, 
  Search, 
  RefreshCw, 
  User, 
  Check, 
  CheckCheck, 
  Clock, 
  Sparkles, 
  Paperclip, 
  Smile, 
  ShieldCheck, 
  FileText,
  Plus,
  Phone,
  ArrowLeft,
  X
} from "lucide-react";

function ChatContent() {
  const searchParams = useSearchParams();
  const initialPhone = searchParams.get("phone") || "";
  const initialMessage = searchParams.get("message") || "";

  const [conversations, setConversations] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedPhone, setSelectedPhone] = useState(initialPhone);
  const [selectedContactName, setSelectedContactName] = useState("");
  const [inputText, setInputText] = useState(initialMessage);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadData = async (activePhone?: string) => {
    try {
      setLoading(true);
      const targetPhone = activePhone || selectedPhone;
      const url = targetPhone 
        ? `/api/chat?phone=${encodeURIComponent(targetPhone)}&search=${encodeURIComponent(search)}`
        : `/api/chat?search=${encodeURIComponent(search)}`;

      const [chatRes, tplRes] = await Promise.all([
        fetch(url),
        fetch("/api/templates")
      ]);

      const chatData = await chatRes.json();
      const tplData = await tplRes.json();

      if (chatData.success) {
        setConversations(chatData.conversations || []);
        setSearchResults(chatData.searchResults || []);
        if (targetPhone) {
          setMessages(chatData.messages || []);
        }
      }
      if (Array.isArray(tplData)) setTemplates(tplData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData(selectedPhone);
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedPhone, search]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSelectConversation = (c: any) => {
    setSelectedPhone(c.phone);
    setSelectedContactName(c.name || c.phone);
    loadData(c.phone);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPhone || !inputText.trim()) return;

    setSending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: selectedPhone,
          content: inputText
        })
      });
      const data = await res.json();
      if (data.success) {
        setInputText("");
        loadData(selectedPhone);
      } else {
        alert(data.error || "Mesaj iletilemedi.");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-3xl bg-[#121517] border border-[#23292e] shadow-xl">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-[#10b981]/15 border border-[#10b981]/30 flex items-center justify-center text-[#10b981]">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-white font-serif-title">
              Canlı WhatsApp Mesajlaşma
            </h1>
            <p className="text-[11px] text-gray-400">
              Gelen ve giden mesaj akışını anlık takip edin, doğrudan yanıt verin veya şablon gönderin.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30 text-xs font-mono font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-ping" />
            <span>Evolution ff: Canlı</span>
          </span>
          <button
            onClick={() => loadData(selectedPhone)}
            className="p-2 rounded-xl bg-[#181c1f] hover:bg-[#202529] text-gray-300 border border-[#2e353c] cursor-pointer"
            title="Sohbetleri Yenile"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#d4af37]" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Chat Layout (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-210px)] min-h-[500px]">
        {/* LEFT COLUMN: Clean Dynamic Conversation List */}
        <div className="lg:col-span-4 bg-[#121517] border border-[#23292e] rounded-3xl p-3 flex flex-col justify-between overflow-hidden shadow-2xl">
          <div className="space-y-2.5 pb-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 font-serif-title">
                SOHBETLER ({conversations.length})
              </span>
            </div>

            {/* Search / Start new chat */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="🔍 Kişi veya numara ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#181c1f] border border-[#2e353c] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#d4af37]"
              />
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-1 mt-1">
            {/* Search Results if any */}
            {searchResults.length > 0 && (
              <div className="space-y-1 pb-2 mb-2 border-b border-[#23292e]">
                <div className="text-[10px] font-bold text-[#d4af37] px-2 py-0.5">REHBER ARAMA SONUÇLARI</div>
                {searchResults.map((res) => (
                  <div
                    key={res.phone}
                    onClick={() => handleSelectConversation(res)}
                    className="p-2.5 rounded-2xl bg-[#181c1f] hover:bg-[#202529] border border-[#d4af37]/30 flex items-center justify-between cursor-pointer transition-all"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate">{res.name}</div>
                      <div className="text-[10px] text-[#10b981] font-mono">{res.phone}</div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#10b981]/20 text-[#10b981] font-bold">+ Başlat</span>
                  </div>
                ))}
              </div>
            )}

            {/* Active Conversations */}
            {conversations.length === 0 && searchResults.length === 0 ? (
              <div className="p-8 text-center text-gray-500 space-y-2">
                <MessageSquare className="w-8 h-8 mx-auto opacity-30 text-[#d4af37]" />
                <p className="text-xs font-semibold text-gray-400">Henüz aktif bir sohbet yok.</p>
                <p className="text-[10px] text-gray-500 max-w-xs mx-auto">
                  WhatsApp üzerinden mesaj geldiğinde veya yukarıdaki arama kutusundan kişi seçtiğinizde sohbetler burada listelenir.
                </p>
              </div>
            ) : (
              conversations.map((c) => {
                const isSelected = selectedPhone === c.phone;
                return (
                  <div
                    key={c.phone}
                    onClick={() => handleSelectConversation(c)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                      isSelected
                        ? "bg-[#181c1f] border-[#d4af37]/40 shadow-md"
                        : "bg-[#141719] border-[#23292e] hover:bg-[#181c1f] hover:border-[#2e353c]"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#d4af37]/20 to-[#10b981]/20 border border-[#d4af37]/30 flex items-center justify-center text-xs font-bold text-[#d4af37] shrink-0 font-mono">
                      {c.name ? c.name.slice(0, 2).toUpperCase() : "WP"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white truncate">
                          {c.name || c.phone}
                        </span>
                        <span className="text-[9px] font-mono text-gray-500">
                          {c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : ""}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">
                        {c.lastMessage}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Active Chat Messages & Composer */}
        <div className="lg:col-span-8 bg-[#121517] border border-[#23292e] rounded-3xl flex flex-col justify-between overflow-hidden shadow-2xl">
          {selectedPhone ? (
            <>
              {/* Chat Header */}
              <div className="p-3.5 sm:p-4 bg-[#161a1d] border-b border-[#23292e] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#d4af37]/20 to-[#10b981]/20 border border-[#d4af37]/30 flex items-center justify-center text-sm font-bold text-[#d4af37] font-mono">
                    {selectedContactName ? selectedContactName.slice(0, 2).toUpperCase() : "WP"}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{selectedContactName || selectedPhone}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30 font-mono font-bold">
                        WhatsApp (ff)
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-400 font-mono">
                      {selectedPhone}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTemplates(!showTemplates)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#181c1f] hover:bg-[#202529] text-[#d4af37] border border-[#d4af37]/30 text-xs font-bold transition-all cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Şablon Seç</span>
                  </button>
                </div>
              </div>

              {/* Templates Drawer */}
              {showTemplates && (
                <div className="p-3 bg-[#181c1f] border-b border-[#23292e] space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between text-xs text-gray-300 font-bold font-serif-title">
                    <span>Hızlı Şablonlar</span>
                    <button onClick={() => setShowTemplates(false)} className="text-gray-400 hover:text-white cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                    {templates.map((tpl) => (
                      <div
                        key={tpl.id}
                        onClick={() => {
                          setInputText(tpl.content);
                          setShowTemplates(false);
                        }}
                        className="p-2 rounded-xl bg-[#121517] hover:bg-[#1a1e21] border border-[#2e353c] text-xs text-gray-200 cursor-pointer transition-all"
                      >
                        <div className="font-bold text-[#d4af37] text-[11px]">{tpl.name}</div>
                        <p className="text-[10px] text-gray-400 truncate mt-0.5">{tpl.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0e1113]/50">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-2">
                    <MessageSquare className="w-8 h-8 opacity-30 text-[#10b981]" />
                    <p className="text-xs">Bu numarayla henüz geçmiş mesaj kaydı yok.</p>
                    <p className="text-[10px] text-gray-400">Aşağıdaki alandan ilk mesajınızı gönderin.</p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMe = true; // Sent messages
                    return (
                      <div
                        key={m.id}
                        className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                      >
                        <div className="max-w-md rounded-2xl p-3 bg-gradient-to-r from-[#064e3b] to-[#047857] text-white border border-[#10b981]/30 shadow-lg space-y-1">
                          <p className="text-xs leading-relaxed whitespace-pre-wrap">{m.content}</p>
                          <div className="flex items-center justify-end gap-1 text-[9px] text-emerald-200/80 font-mono">
                            <span>{new Date(m.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</span>
                            <CheckCheck className="w-3 h-3 text-[#d4af37]" />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar */}
              <form onSubmit={handleSendMessage} className="p-3 bg-[#161a1d] border-t border-[#23292e] flex items-center gap-2">
                <input
                  type="text"
                  required
                  placeholder="Mesajınızı yazın... (Enter ile gönder)"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 bg-[#181c1f] border border-[#2e353c] rounded-2xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#10b981]"
                />

                <button
                  type="submit"
                  disabled={sending || !inputText.trim()}
                  className="p-2.5 rounded-2xl bg-[#10b981] hover:bg-[#059669] text-white font-bold shadow-lg shadow-[#10b981]/20 disabled:opacity-40 transition-all cursor-pointer shrink-0"
                >
                  <Send className={`w-4 h-4 ${sending ? "animate-pulse" : ""}`} />
                </button>
              </form>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-500 space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-[#181c1f] border border-[#2e353c] flex items-center justify-center text-[#d4af37]">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-white font-serif-title">
                Sohbet Başlatın veya Bir Kişi Seçin
              </h3>
              <p className="text-xs text-gray-400 max-w-sm">
                Sol taraftaki listeden bir sohbete tıklayın veya arama çubuğuna numara / isim yazarak yeni bir WhatsApp görüşmesi başlatın.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-gray-400">Sohbet yükleniyor...</div>}>
      <ChatContent />
    </Suspense>
  );
}
