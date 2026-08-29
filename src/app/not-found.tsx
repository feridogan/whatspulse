import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0b141a] text-white p-4">
      <h1 className="text-4xl font-bold mb-2">404</h1>
      <p className="text-gray-400 mb-6">Aradığınız sayfa bulunamadı.</p>
      <Link
        href="/"
        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-semibold transition-colors"
      >
        Ana Sayfaya Dön
      </Link>
    </div>
  );
}
