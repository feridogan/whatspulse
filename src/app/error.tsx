'use client';

import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0b141a] text-white p-4">
      <h1 className="text-3xl font-bold mb-2 text-red-400">Bir Hata Oluştu</h1>
      <p className="text-gray-400 mb-6 text-sm max-w-md text-center">
        {error.message || 'Beklenmeyen bir sistem hatası meydana geldi.'}
      </p>
      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-semibold transition-colors"
      >
        Yeniden Dene
      </button>
    </div>
  );
}
