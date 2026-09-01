'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  Activity, 
  Wifi, 
  WifiOff, 
  LogOut, 
  RefreshCw, 
  User, 
  Menu, 
  Moon, 
  Sun,
  Sparkles,
  ShieldCheck,
  MessageSquare
} from 'lucide-react';

export function Header({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const pathname = usePathname();
  const { user, isAdmin, logout } = useAuth();
  const [status, setStatus] = useState<'open' | 'connecting' | 'close' | 'DISCONNECTED' | 'unknown'>('unknown');
  const [activeInstance, setActiveInstance] = useState<string>('ff');
  const [loading, setLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const checkStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/evolution/status?instance=ff');
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

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const isConnected = status === 'open' || status === 'CONNECTED';

  // Get Page Title in Serif style
  const getPageTitle = () => {
    if (pathname === '/') return 'KONTROL PANELİ';
    if (pathname.startsWith('/chat')) return 'CANLI SOHBET';
    if (pathname.startsWith('/subscribers') || pathname.startsWith('/contacts')) return 'ABONELER & KİŞİLER';
    if (pathname.startsWith('/special-days')) return 'ÖZEL GÜNLER';
    if (pathname.startsWith('/groups')) return 'GRUP YÖNETİMİ';
    if (pathname.startsWith('/reports')) return 'İLETİM RAPORLARI';
    if (pathname.startsWith('/settings')) return 'SİSTEM & BAĞLANTI AYARLARI';
    if (pathname.startsWith('/campaigns')) return 'TOPLU BİLDİRİM';
    return 'WHATSPULSE';
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#23292e] bg-[#0b0d0e]/95 backdrop-blur-md px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Brand / Title / Mobile Menu */}
        <div className="flex items-center gap-3">
          {onMenuToggle && (
            <button
              onClick={onMenuToggle}
              className="p-2 rounded-xl bg-[#121517] hover:bg-[#181c1f] text-gray-300 md:hidden border border-[#23292e]"
              title="Menüyü Aç"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}

          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#d4af37] via-[#f39c12] to-[#10b981] p-0.5 shadow-lg shadow-[#d4af37]/10 transition-transform group-hover:scale-105">
              <div className="w-full h-full bg-[#0b0d0e] rounded-[10px] flex items-center justify-center">
                <Activity className="w-4.5 h-4.5 text-[#d4af37]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-black text-base tracking-wide text-white font-serif-title">
                  WhatsPulse
                </span>
                <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-1.5 py-0.2 rounded bg-[#d4af37]/15 text-[#d4af37] border border-[#d4af37]/30">
                  v2.4.080
                </span>
              </div>
            </div>
          </Link>

          {/* Current Page Title (Serif Style) */}
          <div className="hidden lg:flex items-center gap-2 ml-4 pl-4 border-l border-[#23292e]">
            <span className="font-serif text-xs font-black tracking-widest text-[#d4af37] uppercase font-serif-title">
              {getPageTitle()}
            </span>
          </div>
        </div>

        {/* Right Status Badges & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* WhatsApp Connection Status Badge */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
            isConnected 
              ? 'bg-[#10b981]/15 border-[#10b981]/30 text-[#10b981] shadow-sm shadow-[#10b981]/10' 
              : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
          }`}>
            <span className="relative flex h-2 w-2">
              {isConnected ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10b981]"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              )}
            </span>
            <span className="hidden sm:inline font-mono">
              {isConnected ? '((•)) WhatsApp: Bağlı (ff)' : '((•)) WhatsApp: Kopuk'}
            </span>
            <span className="sm:hidden text-[10px]">
              {isConnected ? 'Bağlı (ff)' : 'Kopuk'}
            </span>
          </div>

          {/* Quick Refresh */}
          <button
            onClick={checkStatus}
            title="Bağlantıyı Yenile"
            disabled={loading}
            className="p-2 rounded-xl bg-[#121517] hover:bg-[#181c1f] text-gray-300 border border-[#23292e] transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#d4af37]' : ''}`} />
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            title="Tema Geçişi"
            className="p-2 rounded-xl bg-[#121517] hover:bg-[#181c1f] text-[#d4af37] border border-[#23292e] transition-colors cursor-pointer"
          >
            {isDarkMode ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
          </button>

          {/* User Profile Card */}
          <div className="flex items-center gap-2 pl-2 border-l border-[#23292e]">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#d4af37]/20 to-[#10b981]/20 border border-[#d4af37]/30 flex items-center justify-center text-xs font-bold text-[#d4af37]">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'SB'}
            </div>
            <div className="text-left leading-tight hidden sm:block">
              <div className="text-xs font-bold text-white truncate max-w-[130px]">
                {user?.name || 'Sedat Bayraklı'}
              </div>
              <div className="text-[10px] text-[#d4af37] font-semibold">
                {user?.role === 'ADMIN' ? 'Yönetici / Admin' : 'Kullanıcı'}
              </div>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            title="Güvenli Çıkış"
            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
