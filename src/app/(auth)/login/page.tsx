'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, Lock, Mail, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@whatspulse.com');
  const [password, setPassword] = useState('Admin123!');
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
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Giriş yapılamadı.');
      }

      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Giriş yapılırken bir sorun oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0b141a] bg-gradient-to-b from-[#0b141a] via-[#111b21] to-[#0b141a]">
      <div className="max-w-md w-full">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 shadow-xl shadow-emerald-500/20 mb-4 animate-pulse-slow">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            WhatsPulse
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            WhatsApp SaaS & Anti-Ban İletişim Platformu
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-[#111b21] border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium flex items-center gap-2">
                <span>⚠️ {error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                E-Posta Adresi
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#202c33] border border-gray-700 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="admin@whatspulse.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Şifre
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#202c33] border border-gray-700 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Quick-fill Button for Seed Admin */}
            <div className="pt-1 flex items-center justify-between text-xs text-gray-400">
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@whatspulse.com');
                  setPassword('Admin123!');
                }}
                className="text-emerald-400 hover:underline flex items-center gap-1 font-medium"
              >
                <Zap className="w-3.5 h-3.5" />
                Varsayılan Yönetici Bilgilerini Doldur
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all transform active:scale-95"
            >
              {loading ? (
                <span>Giriş Yapılıyor...</span>
              ) : (
                <>
                  <span>Panele Giriş Yap</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Feature Badges */}
        <div className="flex items-center justify-center gap-4 mt-6 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Evolution API v2
          </span>
          <span>•</span>
          <span>Anti-Ban Engine</span>
          <span>•</span>
          <span>PWA Uyumlu</span>
        </div>
      </div>
    </div>
  );
}
