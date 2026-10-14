'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Store,
  ArrowRight,
  AlertCircle,
  Lock,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectParam = searchParams.get('redirect') || '';
  const slugParam = searchParams.get('slug') || '';
  const typeParam = searchParams.get('type') || '';
  const errorParam = searchParams.get('error') || '';

  const [activeTab, setActiveTab] = useState<'cashier' | 'owner'>('cashier');
  const [identifier, setIdentifier] = useState('kopi-senja');
  const [pin, setPin] = useState('1234');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeParam === 'owner' || typeParam === 'cashier') {
      setActiveTab(typeParam);
    } else if (redirectParam.startsWith('/admin')) {
      setActiveTab('owner');
    }

    if (slugParam) {
      setIdentifier(slugParam);
    }

    if (errorParam === 'unauthorized') {
      setErrorMsg('Akses ditolak. Silakan login sebagai pemilik outlet untuk membuka dashboard admin.');
    } else if (errorParam === 'pin_required') {
      setErrorMsg('Layar kasir terkunci. Masukkan PIN kasir untuk melanjutkan.');
    }
  }, [typeParam, slugParam, redirectParam, errorParam]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activeTab,
          identifier,
          pin,
          password,
        }),
      });

      const data = await res.json();
      if (data.success) {
        // If there was a redirect URL and matches role
        const destination = redirectParam || data.redirectUrl;
        router.push(destination);
        router.refresh();
      } else {
        setErrorMsg(data.error || 'Login gagal. Periksa kembali data Anda.');
      }
    } catch {
      setErrorMsg('Terjadi kesalahan server saat mencoba login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 text-slate-950 font-black flex items-center justify-center text-xl shadow-lg shadow-emerald-500/20">
            T
          </div>
          <span className="font-black text-2xl tracking-tight text-white">Tap-Order</span>
        </Link>
        <h2 className="text-xl font-extrabold text-white">Masuk ke Sistem Outlet</h2>
        <p className="text-xs text-slate-400">
          Akses terlindungi khusus Kasir & Pemilik Usaha
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 sm:px-10 shadow-2xl rounded-3xl space-y-6">
          {/* Tab Switcher */}
          <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-2xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => {
                setActiveTab('cashier');
                setErrorMsg(null);
              }}
              className={`py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'cashier'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              Kasir (PIN)
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('owner');
                setErrorMsg(null);
              }}
              className={`py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'owner'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              Pemilik (Password)
            </button>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMsg}</div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {activeTab === 'cashier' ? 'Kode / URL Slug Outlet' : 'Email atau URL Slug Outlet'}
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={activeTab === 'cashier' ? 'e.g. kopi-senja' : 'e.g. kopi-senja atau owner@kafe.com'}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono"
              />
            </div>

            {activeTab === 'cashier' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>PIN Cepat Kasir</span>
                  <span className="text-[10px] text-slate-500 font-normal">Default demo: 1234</span>
                </label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="4-6 digit PIN"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-center text-lg font-black tracking-widest text-emerald-400 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Password Pemilik</span>
                  <span className="text-[10px] text-slate-500 font-normal">Default demo: admin123</span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono"
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute right-3.5 top-3 pointer-events-none" />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Memverifikasi...</span>
              ) : (
                <>
                  <span>Masuk Sekarang</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-800/80 text-center text-xs text-slate-400 flex items-center justify-between">
            <Link href="/" className="hover:text-white transition-colors">
              ← Beranda
            </Link>
            <Link href="/register" className="font-semibold text-emerald-400 hover:underline">
              Daftar Usaha Baru
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center">Memuat...</div>}>
      <LoginForm />
    </Suspense>
  );
}
