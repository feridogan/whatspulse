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
  const [loading, setLoading] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);

  const checkStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/evolution/status');
      const data = await res.json();
      if (data.state) {
        setStatus(data.state);
      }
    } catch (err) {
      setStatus('DISCONNECTED');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchQR = async () => {
    try {
      setShowQR(true);
      const res = await fetch('/api/evolution/qr');
      const data = await res.json();
      if (data.qrcode) {
        setQrCode(data.qrcode);
      }
    } catch (err) {
      console.error(err);
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
    <>
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
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}>
              <span className="relative flex h-2 w-2">
                {isConnected ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                )}
              </span>
              <span className="hidden xs:inline">
                {isConnected ? 'WhatsApp Bağlı (sedat2)' : 'Bağlantı Bekleniyor'}
              </span>
            </div>

            {/* QR Code Action Button */}
            {!isConnected && (
              <button
                onClick={handleFetchQR}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-all"
              >
                <QrCode className="w-4 h-4" />
                <span className="hidden sm:inline">QR Tara</span>
              </button>
            )}

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

      {/* QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#111b21] border border-gray-800 rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-2">WhatsApp Web Bağlantısı</h3>
            <p className="text-xs text-gray-400 mb-4">
              Telefonunuzdan WhatsApp &gt; Bağlı Cihazlar &gt; Cihaz Bağla seçeneği ile bu karekodu tarayın.
            </p>

            <div className="bg-white p-4 rounded-xl flex items-center justify-center my-4 mx-auto w-64 h-64 shadow-inner">
              {qrCode ? (
                <img
                  src={qrCode.startsWith('data:image') ? qrCode : `data:image/png;base64,${qrCode}`}
                  alt="WhatsApp QR Code"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-700">
                  <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
                  <span className="text-xs font-medium">QR Kod Üretiliyor...</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleFetchQR}
                className="flex-1 py-2 px-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-medium text-gray-200 transition-colors"
              >
                Yeniden Üret
              </button>
              <button
                onClick={() => setShowQR(false)}
                className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
