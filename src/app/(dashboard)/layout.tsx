import React from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#0b141a]">
      <Header />
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar />
        <main className="flex-1 pb-20 md:pb-8 p-4 md:p-6 overflow-y-auto max-w-full">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
