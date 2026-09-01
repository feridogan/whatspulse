'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  LayoutDashboard, 
  Globe, 
  Users, 
  Layers, 
  Receipt, 
  MessageSquare, 
  Send, 
  BarChart3, 
  Settings, 
  UserCog, 
  ShieldCheck,
  Zap,
  Sparkles,
  FileText
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { user, isAdmin } = useAuth();

  const mainNavigation = [
    { href: '/', label: 'Panel (Dashboard)', icon: LayoutDashboard },
    { href: '/domains', label: 'Alan Adları & Hosting', icon: Globe, badge: 'DNS' },
    { href: '/subscribers', label: 'Aboneler / Müşteriler', icon: Users, badge: 'CRM' },
    { href: '/groups', label: 'Gruplar', icon: Layers },
    { href: '/orders', label: 'Sipariş & Teklifler', icon: Receipt },
    { href: '/chat', label: 'Canlı Sohbet / Mesajlaşma', icon: MessageSquare, badge: 'Canlı' },
    { href: '/campaigns', label: 'Toplu Bildirim & Kuyruk', icon: Send },
    { href: '/templates', label: 'Mesaj Şablonları', icon: FileText },
    { href: '/reports', label: 'Raporlar', icon: BarChart3 },
    { href: '/settings', label: 'Ayarlar', icon: Settings },
  ];

  const adminLinks = [
    { href: '/admin/users', label: 'Kullanıcı Yönetimi', icon: UserCog, badge: 'Admin' },
  ];

  const links = isAdmin ? [...mainNavigation, ...adminLinks] : mainNavigation;

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-gray-800/80 bg-[#0e161c] shrink-0 min-h-[calc(100vh-57px)] p-3.5 justify-between">
      <div className="space-y-4">
        <div className="px-2 pt-1 flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400/80">
            DTS Modülleri
          </span>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#16222b] text-emerald-400 border border-emerald-500/20">
            v3.2
          </span>
        </div>

        <nav className="space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all group ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500/20 via-emerald-500/15 to-teal-500/10 text-amber-300 border border-amber-500/30 shadow-sm shadow-amber-500/5'
                    : 'text-gray-300 hover:bg-[#16222b] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-amber-400' : 'text-gray-400 group-hover:text-emerald-400'
                  }`} />
                  <span className="truncate">{link.label}</span>
                </div>
                {link.badge && (
                  <span className={`text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                    link.badge === 'Admin'
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                      : link.badge === 'DNS'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : link.badge === 'Canlı'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 animate-pulse'
                      : 'bg-teal-500/20 text-teal-300 border-teal-500/30'
                  }`}>
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="space-y-2.5 pt-4 border-t border-gray-800/80">
        {/* Anti-Ban & System Guard Badge */}
        <div className="p-3 rounded-2xl bg-gradient-to-br from-[#121e26] to-[#0d171d] border border-amber-500/20 space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Hat Güvenliği</span>
            </div>
            <span className="text-[9px] uppercase font-bold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/20">
              GÜVENLİ
            </span>
          </div>
          <p className="text-[10px] text-gray-400 leading-tight">
            Otomatik insansı gecikme (5-15 sn) ve sessiz saatler aktif.
          </p>
        </div>

        {/* User Account Info */}
        {user && (
          <div className="p-2.5 rounded-2xl bg-[#131d24] border border-gray-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500/20 to-emerald-500/20 border border-amber-500/30 flex items-center justify-center text-[11px] font-bold text-amber-300 shrink-0">
                {user.name ? user.name.slice(0, 2).toUpperCase() : 'AD'}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">{user.name}</div>
                <div className="text-[10px] text-gray-400 truncate">{user.email}</div>
              </div>
            </div>
            <span className="text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
              {user.role}
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
