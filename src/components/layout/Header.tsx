'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  Wifi, 
  WifiOff, 
  QrCode, 
  LogOut, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  MessageSquare,
  Sparkles,
  User
} from 'lucide-react';

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAdmin, logout } = useAuth();
  const [status, setStatus] = useState<'open' | 'connecting' | 'close' | 'DISCONNECTED' | 'unknown'>('unknown');
  const [activeInstance, setActiveInstance] = useState<string>('feridun');
  const [loading, setLoading] = useState(false);

  const checkStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/evolution/status');
      const data = await res.json();
      if (data.state) {
        setStatus(data.state);
      }
      if (data.instance) {
        setActiveInstance(data.instance);
      }
    } catch (err) {
      setStatus('DISCONNECTED');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const isConnected = status === 'open' || status === 'CONNECTED';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-800 bg-[#111b21]/90 backdrop-blur-md px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo & Title */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg text-white tracking-tight">WhatsPulse</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">PRO</span>
            </div>
            <p className="text-[11px] text-gray-400 -mt-0.5 hidden sm:block">WhatsApp SaaS & Anti-Ban Platform</p>
          </div>
        </Link>

        {/* Right Status & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* WhatsApp Connection State Pill */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
            isConnected 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-sm shadow-emerald-500/10' 
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}>
            <span className="relative flex h-2 w-2">
              {isConnected ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              )}
            </span>
            <span className="hidden xs:inline">
              {isConnected ? `WhatsApp Bağlı (${activeInstance})` : `Bağlantı Yok (${activeInstance})`}
            </span>
          </div>

          {/* Refresh Connection Status */}
          <button
            onClick={checkStatus}
            title="Bağlantıyı Yenile"
            disabled={loading}
            className="p-2 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-300 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            title="Çıkış Yap"
            className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
