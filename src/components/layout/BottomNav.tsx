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
  Settings,
  ShieldBan
} from 'lucide-react';

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Pano', icon: LayoutDashboard },
    { href: '/inbox', label: 'Sohbet', icon: MessageSquare },
    { href: '/contacts', label: 'Rehber', icon: Users },
    { href: '/campaigns', label: 'Toplu Gönder', icon: Send },
    { href: '/templates', label: 'Şablonlar', icon: FileText },
    { href: '/settings', label: 'Ayarlar', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#111b21]/95 backdrop-blur-lg border-t border-gray-800 md:hidden pb-safe">
      <div className="flex items-center justify-around h-16 px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-all ${
                isActive
                  ? 'text-emerald-400 font-semibold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <div className={`relative p-1 rounded-xl transition-all ${
                isActive ? 'bg-emerald-500/15' : ''
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
