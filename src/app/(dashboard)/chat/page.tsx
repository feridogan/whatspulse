"use client";

import React, { useState, useEffect, Suspense } from "react";
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
  FileText
} from "lucide-react";

function ChatContent() {
  const searchParams = useSearchParams();
  const initialPhone = searchParams.get("phone") || "";
  const initialMessage = searchParams.get("message") || "";

  const [messages, setMessages] = useState<any[]>([]);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedPhone, setSelectedPhone] = useState(initialPhone);
  const [inputText, setInputText] = useState(initialMessage);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [msgRes, subRes, tplRes] = await Promise.all([
        fetch("/api/chat"),
        fetch("/api/subscribers?limit=100"),
        fetch("/api/templates")
      ]);
      const msgData = await msgRes.json();
      const subData = await subRes.json();
      const tplData = await tplRes.json();
      if (msgData.success) setMessages(msgData.messages || []);
      if (subData.success) setSubscribers(subData.subscribers || []);
      if (Array.isArray(tplData)) setTemplates(tplData);

      if (!selectedPhone && subData.subscribers?.length > 0) {
        setSelectedPhone(subData.subscribers[0].phone);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

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
        loadData();
      } else {
        alert(data.error || "Mesaj iletilemedi.");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  const filteredSubscribers = subscribers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.phone.includes(search)
  );

  const activeSubscriber = subscribers.find(s => s.phone === selectedPhone) || {
    name: selectedPhone || "Müşteri",
    phone: selectedPhone
  };

  const activeMessages = messages.filter(m => {
    if (!selectedPhone) return false;
    const cleanSel = selectedPhone.replace(/\D/g, "");
    const cleanMsg = m.phone.replace(/\D/g, "");
    return cleanMsg.includes(cleanSel) || cleanSel.includes(cleanMsg);
  }).reverse();

  return (
    <div className="h-[calc(100vh-135px)] flex flex-col space-y-3 animate-fade-in">
      {/* Top Banner */}
      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#111b21] border border-gray-800 shadow-md">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-bold text-white">Canlı WhatsApp Sohbet & İletişim Akışı</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-mono">
            {subscribers.length} Müşteri Sohbeti
          </span>
          <button
            onClick={loadData}
            className="p-1.5 rounded-lg bg-[#202c33] text-gray-400 hover:text-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 min-h-0">
        {/* Left: Chat Contacts List */}
        <div className="p-3.5 rounded-3xl bg-[#111b21] border border-gray-800 flex flex-col space-y-3 min-h-0 shadow-xl">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Sohbetlerde ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#202c33] border border-gray-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
            {filteredSubscribers.map((sub) => {
              const isSelected = sub.phone === selectedPhone;
              return (
                <button
                  key={sub.id}
                  onClick={() => setSelectedPhone(sub.phone)}
                  className={`w-full p-2.5 rounded-2xl text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                    isSelected
                      ? "bg-emerald-600/20 text-white border border-emerald-500/40 shadow-sm"
                      : "bg-[#16222b] text-gray-300 hover:bg-[#202c33] border border-gray-800"
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500/20 to-emerald-500/20 border border-amber-500/30 flex items-center justify-center text-xs font-bold text-amber-300 font-mono shrink-0">
                    {sub.name ? sub.name.slice(0, 2).toUpperCase() : "AB"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-xs truncate">{sub.name}</div>
                    <div className="text-[10px] text-gray-400 font-mono truncate">{sub.phone}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Active Conversation Window */}
        <div className="md:col-span-2 rounded-3xl bg-[#111b21] border border-gray-800 flex flex-col min-h-0 shadow-xl overflow-hidden">
          {/* Chat Header */}
          <div className="p-3.5 bg-[#16222b] border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-bold text-xs">
                <User className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">{activeSubscriber.name}</div>
                <div className="text-[10px] text-gray-400 font-mono">{activeSubscriber.phone}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                WhatsApp Web Bağlı
              </span>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-[#0b141a]/60">
            {activeMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-2">
                <MessageSquare className="w-8 h-8 opacity-30 text-amber-400" />
                <p className="text-xs">Bu numarayla henüz geçmiş mesaj kaydı yok.</p>
                <p className="text-[11px] text-gray-600">Aşağıdaki kutudan ilk mesajınızı doğrudan WhatsApp üzerinden gönderebilirsiniz.</p>
              </div>
            ) : (
              activeMessages.map((msg) => (
                <div key={msg.id} className="flex flex-col items-end">
                  <div className="max-w-md p-3 rounded-2xl bg-[#005c4b] text-white text-xs shadow-md space-y-1 rounded-br-none">
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    <div className="flex items-center justify-end gap-1 text-[9px] text-gray-300 font-mono pt-1">
                      <span>{new Date(msg.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</span>
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-300" />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Quick Template Chips */}
          {templates.length > 0 && (
            <div className="px-3 py-1.5 bg-[#16222b] border-t border-gray-800 flex items-center gap-1.5 overflow-x-auto">
              <span className="text-[10px] text-gray-500 shrink-0 flex items-center gap-1">
                <FileText className="w-3 h-3 text-amber-400" /> Şablon:
              </span>
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setInputText(tpl.content.replace("{isim}", activeSubscriber.name))}
                  className="px-2 py-0.5 rounded-lg bg-[#202c33] hover:bg-emerald-500/20 text-gray-300 hover:text-emerald-300 text-[10px] truncate max-w-[140px] border border-gray-700 shrink-0 cursor-pointer"
                  title={tpl.name}
                >
                  {tpl.name}
                </button>
              ))}
            </div>
          )}

          {/* Message Input Box */}
          <form onSubmit={handleSendMessage} className="p-3 bg-[#16222b] border-t border-gray-800 flex items-center gap-2">
            <input
              type="text"
              required
              placeholder="WhatsApp mesajınızı yazın..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-[#202c33] border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />

            <button
              type="submit"
              disabled={sending || !inputText.trim()}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{sending ? "..." : "Gönder"}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-gray-400">Sohbet yükleniyor...</div>}>
      <ChatContent />
    </Suspense>
  );
}
