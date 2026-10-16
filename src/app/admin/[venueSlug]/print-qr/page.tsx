'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Printer, Smartphone } from 'lucide-react';
import QRCode from 'qrcode';

type Table = {
  id: string;
  number: string;
  label: string | null;
  cardToken: string;
};

export default function PrintQRPage() {
  const params = useParams();
  const venueSlug = params.venueSlug as string;

  const [venue, setVenue] = useState<any | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [menuRes, tblRes] = await Promise.all([
          fetch(`/api/menu/${venueSlug}`),
          fetch(`/api/venues/${venueSlug}/tables`),
        ]);

        const menuData = await menuRes.json();
        const tblData = await tblRes.json();

        if (menuData.success) setVenue(menuData.venue);
        if (tblData.success) {
          setTables(tblData.tables);

          // Generate QR data URLs
          const qrs: Record<string, string> = {};
          const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

          for (const t of tblData.tables) {
            const tableUrl = `${baseUrl}/c/${t.cardToken}`;
            qrs[t.cardToken] = await QRCode.toDataURL(tableUrl, {
              width: 250,
              margin: 1,
              color: { dark: '#0f172a', light: '#ffffff' },
            });
          }
          setQrImages(qrs);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [venueSlug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-slate-800">
        <p className="text-sm font-semibold">Menyiapkan lembar cetak QR meja...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans print:bg-white print:p-0">
      {/* Top Bar for Screen only */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between print:hidden sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/${venueSlug}`}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-extrabold text-base text-slate-900">Lembar Cetak Kartu / QR Meja</h1>
            <p className="text-xs text-slate-500">{venue?.name} • {tables.length} Meja Terdaftar</p>
          </div>
        </div>

        <button
          onClick={() => window.print()}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-2 shadow-md transition-all active:scale-95"
        >
          <Printer className="w-4 h-4" />
          <span>Cetak / Simpan PDF (Ctrl + P)</span>
        </button>
      </header>

      {/* Printable Sheet */}
      <main className="max-w-5xl mx-auto p-6 print:p-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 print:grid-cols-2 print:gap-4">
          {tables.map((table) => {
            const qrSrc = qrImages[table.cardToken];
            const tableUrl = typeof window !== 'undefined' ? `${window.location.origin}/c/${table.cardToken}` : '';

            return (
              <div
                key={table.id}
                className="bg-white rounded-3xl p-6 border-2 border-slate-300 text-center flex flex-col items-center justify-between shadow-sm print:shadow-none print:border-slate-800 print:rounded-2xl page-break-inside-avoid"
              >
                {/* Header */}
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-[11px] font-bold">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>NFC & QR ORDER</span>
                  </div>
                  <h2 className="text-lg font-black text-slate-900">{venue?.name}</h2>
                </div>

                {/* Table Big Number */}
                <div className="my-3 py-2 px-6 bg-slate-900 text-white rounded-2xl w-full">
                  <span className="text-xs text-slate-400 font-semibold block uppercase">Nomor Meja</span>
                  <span className="text-3xl font-black tracking-tight">{table.number}</span>
                </div>

                {/* QR Code */}
                {qrSrc && (
                  <div className="p-2 bg-white rounded-2xl border border-slate-200 shadow-xs my-2">
                    <img src={qrSrc} alt={`QR Meja ${table.number}`} className="w-40 h-40 object-contain mx-auto" />
                  </div>
                )}

                {/* Instructions */}
                <div className="space-y-1 text-xs text-slate-600 mt-2">
                  <p className="font-bold text-slate-900 text-[13px]">Tempelkan HP ke Kartu Meja</p>
                  <p className="text-[11px] text-slate-500">atau Scan QR ini untuk pesan menu langsung</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 w-full flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>TOKEN: {table.cardToken}</span>
                  <span>Tap-Order.id</span>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
