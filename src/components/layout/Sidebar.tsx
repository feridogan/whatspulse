'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Users, 
  Send, 
  FileText, 
  ShieldAlert, 
  Settings,
  Sparkles,
  Zap,
  HelpCircle
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Genel Bakış & Pano', icon: LayoutDashboard },
    { href: '/inbox', label: 'Canlı Sohbet / Team Inbox', icon: MessageSquare, badge: 'Canlı' },
    { href: '/contacts', label: 'Kişiler & Gruplar', icon: Users },
    { href: '/campaigns', label: 'Toplu Gönderim & Kuyruk', icon: Send },
    { href: '/templates', label: 'Mesaj Şablonları', icon: FileText },
    { href: '/blacklist', label: 'Kara Liste / Opt-Out', icon: ShieldAlert },
    { href: '/settings', label: 'Evolution API & Ayarlar', icon: Settings },
  ];

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
                  <span className="text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-md border border-emerald-500/30">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Anti-Ban & System Info Card */}
      <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-950/40 to-teal-950/20 border border-emerald-500/20 space-y-2">
        <div className="flex items-center gap-2 text-emerald-400">
          <Zap className="w-4 h-4 fill-emerald-400" />
          <span className="text-xs font-bold">Anti-Ban Koruması</span>
        </div>
        <p className="text-[11px] text-gray-400 leading-relaxed">
          BullMQ kuyruğu ve rastgele 8-20 sn insansı gecikme motoru devrede.
        </p>
      </div>
    </aside>
  );
}
