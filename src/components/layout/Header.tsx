'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  Globe, 
  Wifi, 
  WifiOff, 
  LogOut, 
  RefreshCw, 
  ShieldCheck,
  User,
  Menu,
  Sparkles,
  Layers,
  Crown
} from 'lucide-react';

export function Header({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAdmin, logout } = useAuth();
  const [status, setStatus] = useState<'open' | 'connecting' | 'close' | 'DISCONNECTED' | 'unknown'>('unknown');
  const [activeInstance, setActiveInstance] = useState<string>('ff');
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

  // Get Page Title
  const getPageTitle = () => {
    if (pathname === '/') return 'Genel Bakış & DTS Pano';
    if (pathname.startsWith('/domains')) return 'Alan Adları & Hosting Takibi';
    if (pathname.startsWith('/subscribers') || pathname.startsWith('/contacts')) return 'Aboneler & Müşteri Rehberi';
    if (pathname.startsWith('/groups')) return 'Abone & Müşteri Grupları';
    if (pathname.startsWith('/orders')) return 'Siparişler & Teklif Yönetimi';
    if (pathname.startsWith('/chat')) return 'Canlı Sohbet & WhatsApp Akışı';
    if (pathname.startsWith('/campaigns')) return 'Toplu Bildirim & Kuyruk';
    if (pathname.startsWith('/templates')) return 'Bildirim Şablonları';
    if (pathname.startsWith('/reports')) return 'İletim & Yenileme Raporları';
    if (pathname.startsWith('/settings')) return 'Sistem & Evolution API Ayarları';
    if (pathname.startsWith('/admin/users')) return 'Kullanıcı & Yetki Yönetimi';
    return 'DTS Panel';
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-800/80 bg-[#0b141a]/95 backdrop-blur-md px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Brand / Title / Mobile Menu */}
        <div className="flex items-center gap-3">
          {onMenuToggle && (
            <button
              onClick={onMenuToggle}
              className="p-2 rounded-xl bg-[#111b21] hover:bg-[#202c33] text-gray-300 md:hidden border border-gray-800"
              title="Menüyü Aç"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}

          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-amber-500/10 transition-transform group-hover:scale-105">
              <div className="w-full h-full bg-[#0b141a] rounded-[10px] flex items-center justify-center">
                <Globe className="w-4 h-4 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-white font-mono">DTS</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-gradient-to-r from-amber-500/20 to-emerald-500/20 text-amber-300 border border-amber-500/30">
                  ENTERPRISE
                </span>
              </div>
              <p className="text-[10px] text-gray-400 -mt-0.5 hidden sm:block">Domain Takip & İletişim Sistemi</p>
            </div>
          </Link>

          {/* Current Page Subtitle in Desktop */}
          <div className="hidden lg:flex items-center gap-2 ml-4 pl-4 border-l border-gray-800">
            <span className="text-xs font-semibold text-gray-300">{getPageTitle()}</span>
          </div>
        </div>

        {/* Right Status Badges & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* WhatsApp Connection Status Badge */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
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
            <span className="hidden sm:inline font-mono">
              {isConnected ? `WhatsApp: BAĞLI (${activeInstance})` : `WhatsApp: KOPUK (${activeInstance})`}
            </span>
            <span className="sm:hidden text-[10px]">
              {isConnected ? 'BAĞLI' : 'KOPUK'}
            </span>
          </div>

          {/* Quick Status Refresh */}
          <button
            onClick={checkStatus}
            title="WhatsApp Durumunu Kontrol Et"
            disabled={loading}
            className="p-2 rounded-xl bg-[#111b21] hover:bg-[#202c33] text-gray-300 border border-gray-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          {/* User Profile Card */}
          {user && (
            <div className="hidden md:flex items-center gap-2 pl-2 border-l border-gray-800">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500/20 to-emerald-500/20 border border-amber-500/30 flex items-center justify-center text-xs font-bold text-amber-300">
                {user.name ? user.name.substring(0, 2).toUpperCase() : 'AD'}
              </div>
              <div className="text-left leading-tight hidden xl:block">
                <div className="text-xs font-bold text-white truncate max-w-[120px]">{user.name}</div>
                <div className="text-[10px] text-amber-400 font-semibold">{user.role}</div>
              </div>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            title="Çıkış Yap"
            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
