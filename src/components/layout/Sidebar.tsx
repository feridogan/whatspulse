'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Users, 
  Calendar, 
  FolderTree, 
  BarChart3, 
  Settings, 
  LogOut,
  ShieldCheck,
  Activity
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  const menuItems = [
    { href: '/', label: 'Panel', icon: LayoutDashboard },
    { href: '/chat', label: 'Canlı Sohbet', icon: MessageSquare, badge: 'Canlı' },
    { href: '/subscribers', label: 'Aboneler / Kişiler', icon: Users, badge: 'Rehber' },
    { href: '/special-days', label: 'Özel Günler', icon: Calendar },
    { href: '/groups', label: 'Gruplar', icon: FolderTree },
    { href: '/reports', label: 'Raporlar', icon: BarChart3 },
    { href: '/settings', label: 'Ayarlar', icon: Settings },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-[#23292e] bg-[#0e1113] shrink-0 min-h-[calc(100vh-57px)] p-3.5 justify-between">
      <div className="space-y-4">
        <div className="px-2 pt-1 flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#d4af37]">
            WHATSPULSE MENÜ
          </span>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#161a1d] text-[#10b981] border border-[#10b981]/20">
            PRO v2.4
          </span>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                  isActive
                    ? 'bg-gradient-to-r from-[#d4af37]/20 via-[#10b981]/15 to-transparent text-[#d4af37] border border-[#d4af37]/35 shadow-sm shadow-[#d4af37]/5'
                    : 'text-gray-300 hover:bg-[#161a1d] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-[#d4af37]' : 'text-gray-400 group-hover:text-[#10b981]'
                  }`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                    item.badge === 'Canlı'
                      ? 'bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30 animate-pulse'
                      : 'bg-[#d4af37]/20 text-[#d4af37] border-[#d4af37]/30'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="space-y-3 pt-4 border-t border-[#23292e]">
        {/* Anti-Ban & System Security Card */}
        <div className="p-3 rounded-2xl bg-[#121517] border border-[#d4af37]/20 space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[#d4af37] text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Hat Güvenliği (ff)</span>
            </div>
            <span className="text-[9px] uppercase font-bold text-[#10b981] bg-[#10b981]/15 px-1.5 py-0.5 rounded border border-[#10b981]/20">
              GÜVENLİ
            </span>
          </div>
          <p className="text-[10px] text-gray-400 leading-tight">
            İnsansı gecikme (5-15 sn) ve sessiz saatler devrede.
          </p>
        </div>

        {/* Secure Logout Button */}
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>→ Güvenli Çıkış</span>
        </button>
      </div>
    </aside>
  );
}
