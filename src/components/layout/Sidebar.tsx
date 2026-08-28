'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Users, 
  Send, 
  FileText, 
  ShieldAlert, 
  Settings,
  UserCog,
  Zap,
  ShieldCheck,
  User
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { user, isAdmin } = useAuth();

  const baseLinks = [
    { href: '/', label: 'Genel Bakış & Pano', icon: LayoutDashboard },
    { href: '/inbox', label: 'Canlı Sohbet / Team Inbox', icon: MessageSquare, badge: 'Canlı' },
    { href: '/contacts', label: 'Kişiler & Gruplar', icon: Users },
    { href: '/campaigns', label: 'Toplu Gönderim & Kuyruk', icon: Send },
    { href: '/templates', label: 'Mesaj Şablonları', icon: FileText },
    { href: '/blacklist', label: 'Kara Liste / Opt-Out', icon: ShieldAlert },
  ];

  const adminLinks = [
    { href: '/admin/users', label: 'Kullanıcı Yönetimi', icon: UserCog, badge: 'Admin' },
    { href: '/settings', label: 'Evolution API & Ayarlar', icon: Settings },
  ];

  const links = isAdmin ? [...baseLinks, ...adminLinks] : baseLinks;

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-gray-800 bg-[#111b21] shrink-0 min-h-[calc(100vh-61px)] p-4 justify-between">
      <div className="space-y-6">
        <div className="px-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
            Ana Menü
          </div>
        </div>

        <nav className="space-y-1.5">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-600/20 to-teal-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'text-gray-300 hover:bg-gray-800/60 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-gray-400'}`} />
                  <span>{link.label}</span>
                </div>
                {link.badge && (
                  <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md border ${
                    link.badge === 'Admin'
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="space-y-3">
        {/* User Account Pill */}
        {user && (
          <div className="p-3 rounded-2xl bg-[#202c33]/70 border border-gray-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                isAdmin
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
              }`}>
                {user.name?.slice(0, 2).toUpperCase() || 'U'}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">{user.name}</div>
                <div className="text-[10px] text-gray-400 truncate">{user.email}</div>
              </div>
            </div>

            <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border shrink-0 ${
              isAdmin
                ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
            }`}>
              {isAdmin ? 'ADMIN' : 'USER'}
            </span>
          </div>
        )}

        {/* Anti-Ban & System Info Card */}
        <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-950/40 to-teal-950/20 border border-emerald-500/20 space-y-1.5">
          <div className="flex items-center gap-2 text-emerald-400">
            <Zap className="w-4 h-4 fill-emerald-400" />
            <span className="text-xs font-bold">Anti-Ban Koruması</span>
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            BullMQ kuyruğu ve rastgele insansı gecikme motoru devrede.
          </p>
        </div>
      </div>
    </aside>
  );
}
