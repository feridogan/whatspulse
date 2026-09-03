'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Lock, Mail, ArrowRight, ShieldCheck, Zap, AlertCircle, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@whatspulse.com');
  const [password, setPassword] = useState('Admin123!');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Geçersiz e-posta veya şifre.');
      }

      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Giriş yapılırken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0b0d0e] bg-radial from-[#161a1d] via-[#0b0d0e] to-[#08090a]">
      <div className="max-w-md w-full space-y-6 animate-fade-in">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#d4af37] via-[#f39c12] to-[#10b981] p-0.5 shadow-2xl shadow-[#d4af37]/20">
            <div className="w-full h-full bg-[#0b0d0e] rounded-[22px] flex items-center justify-center">
              <Activity className="w-8 h-8 text-[#d4af37]" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wide font-serif-title">
                WhatsPulse
              </h1>
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-[#d4af37]/15 text-[#d4af37] border border-[#d4af37]/30">
                v2.6.001
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              WhatsApp SaaS & Toplu Mesaj Yönetim Platformu
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-[#121517] border border-[#23292e] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
          <div className="border-b border-[#23292e] pb-3 text-center">
            <h2 className="text-sm font-bold text-white font-serif-title uppercase tracking-wider">
              Yönetici Girişi
            </h2>
            <p className="text-[11px] text-gray-400">
              Lütfen kullanıcı bilgilerinizi giriniz.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5 font-serif-title">
                E-Posta / Kullanıcı Adı
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#181c1f] border border-[#2e353c] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#d4af37] transition-colors font-mono"
                  placeholder="admin@whatspulse.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5 font-serif-title">
                Şifre
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#181c1f] border border-[#2e353c] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#d4af37] transition-colors font-mono"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Remember Me & Quick fill */}
            <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 accent-[#d4af37] rounded"
                />
                <span>Beni Hatırla</span>
              </label>

              <button
                type="button"
                onClick={() => {
                  setEmail('admin@whatspulse.com');
                  setPassword('Admin123!');
                }}
                className="text-[#d4af37] hover:underline flex items-center gap-1 text-[11px] font-semibold"
              >
                <Zap className="w-3 h-3 text-[#d4af37]" />
                <span>Varsayılan Yöneticiyi Doldur</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-[#d4af37] via-[#f39c12] to-[#10b981] hover:from-[#e5c158] hover:to-[#059669] text-black font-black rounded-xl shadow-xl shadow-[#d4af37]/20 flex items-center justify-center gap-2 text-xs transition-all transform active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>Giriş Yapılıyor...</span>
              ) : (
                <>
                  <span>Giriş Yap</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Feature Badges */}
        <div className="flex items-center justify-center gap-3 text-[11px] text-gray-500">
          <span className="flex items-center gap-1 text-[#10b981] font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            Evolution API v2
          </span>
          <span>•</span>
          <span>Anti-Ban Engine</span>
          <span>•</span>
          <span>Instance: ff</span>
        </div>
      </div>
    </div>
  );
}
