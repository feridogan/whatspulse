'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SubscribersPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/contacts');
  }, [router]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-8 h-8 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin mb-3"></div>
      <p className="text-xs text-gray-400 font-mono">Kişiler ve Rehber modülüne yönlendiriliyorsunuz...</p>
    </div>
  );
}
