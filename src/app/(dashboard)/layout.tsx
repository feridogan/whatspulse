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
    <div className="min-h-screen flex flex-col bg-[#0b0d0e] text-[#e9edef]">
      <Header />
      <div className="flex-1 flex max-w-screen-2xl w-full mx-auto min-w-0">
        <Sidebar />
        <main className="flex-1 min-w-0 pb-24 md:pb-8 p-3 sm:p-4 md:p-6 overflow-y-auto max-w-full">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
