'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Store,
  Smartphone,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Lock,
  Mail,
  MapPin,
  Phone,
} from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [tablesCount, setTablesCount] = useState(10);
  const [pinCashier, setPinCashier] = useState('1234');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleNameChange = (val: string) => {
    setName(val);
    const autoSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 30);
    setSlug(autoSlug);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug,
          phone,
          whatsapp,
          address,
          tablesCount,
          pinCashier,
          ownerEmail,
          password,
        }),
      });

      const data = await res.json();

      if (data.success && data.venue) {
        // Redirect directly to their new owner dashboard
        router.push(`/admin/${data.venue.slug}`);
      } else {
        setErrorMsg(data.error || 'Gagal mendaftarkan usaha');
      }
    } catch {
      setErrorMsg('Terjadi kesalahan jaringan');
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
        <h2 className="text-xl font-extrabold text-white">Daftarkan Restoran / Kafe Anda</h2>
        <p className="text-xs text-slate-400">
          Uji coba gratis 14 hari penuh. Pelanggan langsung bisa tap kartu meja dan memesan.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 sm:px-10 shadow-2xl rounded-3xl space-y-6">
          {errorMsg && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300">Nama Usaha / Kafe / Resto</label>
              <input
                type="text"
                required
                placeholder="Misal: Kopi Kenangan Cempaka"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="mt-1.5 w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300">URL Identitas Outlet (Slug)</label>
              <div className="mt-1.5 flex items-center rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm">
                <span className="text-slate-500 text-xs">taporder.id/m/</span>
                <input
                  type="text"
                  required
                  placeholder="kopi-kenangan"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="w-full bg-transparent text-emerald-400 font-semibold focus:outline-none pl-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300">No. WhatsApp Pemilik</label>
                <input
                  type="tel"
                  required
                  placeholder="08123456789"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="mt-1.5 w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300">Jumlah Meja Awal</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={tablesCount}
                  onChange={(e) => setTablesCount(parseInt(e.target.value) || 10)}
                  className="mt-1.5 w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">Otomatis buat Meja 01 s/d {tablesCount}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300">Alamat Tempat Usaha</label>
              <input
                type="text"
                placeholder="Jl. Sudirman No. 12, Jakarta"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1.5 w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
              <div>
                <label className="block text-xs font-bold text-slate-300">PIN Kasir (4 Digit)</label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  value={pinCashier}
                  onChange={(e) => setPinCashier(e.target.value)}
                  className="mt-1.5 w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white text-center font-mono tracking-widest focus:border-emerald-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">Untuk buka layar kasir di tablet</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300">Password Pemilik</label>
                <input
                  type="password"
                  required
                  placeholder="Min 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1.5 w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold py-3.5 px-4 rounded-xl text-sm shadow-xl shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span>Mendaftarkan & Membuat Meja...</span>
                ) : (
                  <>
                    <span>Daftarkan & Mulai Buka Outlet</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="text-center pt-2">
            <p className="text-xs text-slate-400">
              Sudah punya akun outlet?{' '}<Link href="/login" className="text-emerald-400 font-bold hover:underline">Masuk di sini</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
