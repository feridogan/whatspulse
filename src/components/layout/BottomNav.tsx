'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Globe, 
  Users, 
  Layers, 
  MessageSquare, 
  Settings 
} from 'lucide-react';

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Panel', icon: LayoutDashboard },
    { href: '/domains', label: 'Domainler', icon: Globe },
    { href: '/subscribers', label: 'Aboneler', icon: Users },
    { href: '/groups', label: 'Gruplar', icon: Layers },
    { href: '/chat', label: 'Sohbet', icon: MessageSquare },
    { href: '/settings', label: 'Ayarlar', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0b141a]/95 backdrop-blur-lg border-t border-gray-800 md:hidden px-2 py-1.5 flex items-center justify-around">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
              isActive
                ? 'text-amber-400 bg-amber-500/10'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="text-[10px] font-semibold mt-0.5">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
