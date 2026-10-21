'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  UtensilsCrossed,
  Bell,
  Wifi,
  Star,
  MessageSquare,
  ChevronRight,
  X,
  Check,
  Copy,
  Clock,
  Instagram,
  MapPin,
  Phone,
  RotateCcw,
  Receipt,
} from 'lucide-react';
import { formatRupiah } from '@/lib/utils';

type Venue = {
  id: string;
  name: string;
  slug: string;
  isOpen: boolean;
  whatsapp: string | null;
  address: string | null;
  wifiSsid: string | null;
  wifiPassword: string | null;
  gmapsReviewUrl: string | null;
  instagramUrl: string | null;
};

type ActiveOrder = {
  id: string;
  orderNumber: string;
  status: string;
  isPaid: boolean;
  totalAmount: number;
  items: { nameSnapshot: string; quantity: number }[];
  queueAhead: number;
};

const STATUS_LABEL: Record<string, string> = {
  awaiting_payment: 'Menunggu Pembayaran',
  pending: 'Diterima Kasir',
  preparing: 'Sedang Dimasak',
  served: 'Siap / Sudah Diantar',
};

/** ~4 menit per order di depan, dibulatkan. Angka kasar, jangan dijanjikan presisi. */
function estimateMinutes(queueAhead: number) {
  return Math.max(5, 5 + queueAhead * 4);
}

export default function TableHub({
  menuUrl,
  cardToken,
  venue,
  table,
  activeOrder,
}: {
  menuUrl: string;
  cardToken: string;
  venue: Venue;
  table: { id: string; number: string; label: string | null };
  activeOrder: ActiveOrder | null;
}) {
  const [sheet, setSheet] = useState<null | 'waiter' | 'wifi' | 'feedback' | 'order' | 'info'>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notify(`${label} disalin`);
    } catch {
      notify('Gagal menyalin, silakan catat manual');
    }
  };

  const sendRequest = async (type: string, label: string) => {
    setSending(true);
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venueId: venue.id, tableId: table.id, cardToken, type }),
      });
      const data = await res.json();
      notify(data.success ? `${label} dikirim ke kasir` : data.error || 'Gagal mengirim');
      if (data.success) setSheet(null);
    } catch {
      notify('Jaringan bermasalah');
    } finally {
      setSending(false);
    }
  };

  const sendFeedback = async () => {
    if (feedbackMsg.trim().length < 3) return notify('Tulis masukan dulu ya');
    setSending(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venueId: venue.id,
          cardToken,
          rating: feedbackRating ?? undefined,
          message: feedbackMsg.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackMsg('');
        setFeedbackRating(null);
        setSheet(null);
      }
      notify(data.success ? 'Terkirim anonim. Terima kasih!' : data.error || 'Gagal mengirim');
    } catch {
      notify('Jaringan bermasalah');
    } finally {
      setSending(false);
    }
  };

  const billText = activeOrder
    ? `Tagihan ${venue.name}%0AMeja ${table.number}%0APesanan ${activeOrder.orderNumber}%0A${activeOrder.items
        .map((i) => `${i.quantity}x ${i.nameSnapshot}`)
        .join('%0A')}%0ATotal: ${formatRupiah(activeOrder.totalAmount)}`
    : '';

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      {/* Header: nomor meja besar supaya tamu tidak salah meja */}
      <header className="bg-slate-900 text-white px-5 pt-7 pb-6 rounded-b-3xl">
        <p className="text-xs font-semibold text-emerald-400 tracking-wide uppercase">
          {venue.isOpen ? 'Sedang Buka' : 'Sedang Tutup'}
        </p>
        <h1 className="text-xl font-black mt-1 leading-tight">{venue.name}</h1>
        <div className="mt-4 flex items-end gap-3">
          <span className="text-[11px] font-bold text-slate-400 uppercase pb-1.5">Meja</span>
          <span className="text-5xl font-black tracking-tight leading-none">{table.number}</span>
          {table.label && <span className="text-xs text-slate-400 pb-1.5">{table.label}</span>}
        </div>
      </header>

      <main className="px-4 -mt-4 space-y-3">
        {/* 1. PESAN SEKARANG — tile utama, paling besar */}
        <Link
          href={menuUrl}
          className="block bg-emerald-500 active:bg-emerald-600 text-slate-950 rounded-3xl p-6 shadow-lg shadow-emerald-500/25 transition-colors"
        >
          <UtensilsCrossed className="w-8 h-8 mb-3" />
          <p className="text-lg font-black leading-tight">Pesan Sekarang</p>
          <p className="text-xs font-medium opacity-80 mt-1">
            Lihat menu, pilih, lalu bayar langsung
          </p>
          <div className="mt-4 inline-flex items-center gap-1 text-xs font-bold">
            Buka Katalog <ChevronRight className="w-4 h-4" />
          </div>
        </Link>

        {/* 2. STATUS PESANAN — kondisional + estimasi tunggu */}
        {activeOrder && (
          <button
            onClick={() => setSheet('order')}
            className="w-full text-left bg-white border border-slate-200 rounded-2xl p-4 active:bg-slate-50"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Pesanan {activeOrder.orderNumber}
                  </p>
                  <p className="text-xs text-slate-500">
                    {STATUS_LABEL[activeOrder.status] || activeOrder.status}
                    {activeOrder.status === 'preparing' || activeOrder.status === 'pending'
                      ? ` · ± ${estimateMinutes(activeOrder.queueAhead)} menit`
                      : ''}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300" />
            </div>
          </button>
        )}

        {/* 3. PANGGIL PELAYAN */}
        <Tile
          icon={<Bell className="w-5 h-5" />}
          color="bg-sky-100 text-sky-600"
          title="Panggil Pelayan"
          subtitle="Tisu, air putih, sambal, bersihkan meja"
          onClick={() => setSheet('waiter')}
        />

        {/* 4. WIFI — kondisional */}
        {venue.wifiSsid && (
          <Tile
            icon={<Wifi className="w-5 h-5" />}
            color="bg-indigo-100 text-indigo-600"
            title="WiFi Gratis"
            subtitle={venue.wifiSsid}
            onClick={() => setSheet('wifi')}
          />
        )}

        {/* 5. ULAS DI GOOGLE — kondisional, netral (tanpa penyaringan skor) */}
        {venue.gmapsReviewUrl && (
          <a
            href={venue.gmapsReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-white border border-slate-200 rounded-2xl p-4 active:bg-slate-50"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-100 text-yellow-600 flex items-center justify-center">
                  <Star className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Ulas di Google</p>
                  <p className="text-xs text-slate-500">Bantu kami dengan ulasan jujur</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300" />
            </div>
          </a>
        )}

        {/* 6. KRITIK & SARAN ANONIM */}
        <Tile
          icon={<MessageSquare className="w-5 h-5" />}
          color="bg-rose-100 text-rose-600"
          title="Kritik & Saran"
          subtitle="Anonim — tidak ada nama, meja, atau kontak"
          onClick={() => setSheet('feedback')}
        />

        {/* 7. INFO OUTLET — kondisional */}
        {(venue.whatsapp || venue.address || venue.instagramUrl) && (
          <Tile
            icon={<MapPin className="w-5 h-5" />}
            color="bg-slate-100 text-slate-600"
            title="Info Outlet"
            subtitle="Kontak, alamat, Instagram"
            onClick={() => setSheet('info')}
          />
        )}

        <p className="text-center text-[10px] text-slate-400 pt-4">
          Tap-Order · tanpa unduh aplikasi
        </p>
      </main>

      {/* ---------------- Sheets ---------------- */}
      {sheet && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-end"
          onClick={() => setSheet(null)}
        >
          <div
            className="bg-white w-full rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-black text-slate-900">
                {sheet === 'waiter' && 'Panggil Pelayan'}
                {sheet === 'wifi' && 'WiFi Gratis'}
                {sheet === 'feedback' && 'Kritik & Saran Anonim'}
                {sheet === 'order' && `Pesanan ${activeOrder?.orderNumber}`}
                {sheet === 'info' && 'Info Outlet'}
              </h2>
              <button onClick={() => setSheet(null)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {sheet === 'waiter' && (
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  ['waiter', 'Panggil Pelayan'],
                  ['tissue', 'Minta Tisu'],
                  ['water', 'Air Putih'],
                  ['condiment', 'Sambal / Kecap'],
                  ['clean', 'Bersihkan Meja'],
                ].map(([type, label]) => (
                  <button
                    key={type}
                    disabled={sending}
                    onClick={() => sendRequest(type, label)}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 active:bg-slate-100 disabled:opacity-50"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {sheet === 'wifi' && (
              <div className="space-y-3">
                <Field label="Nama WiFi (SSID)" value={venue.wifiSsid!} onCopy={copy} />
                {venue.wifiPassword && (
                  <Field label="Password" value={venue.wifiPassword} onCopy={copy} />
                )}
                <p className="text-[11px] text-slate-500 leading-relaxed bg-amber-50 border border-amber-200 rounded-xl p-3">
                  Browser tidak bisa menyambungkan WiFi otomatis. Salin password lalu buka
                  Pengaturan WiFi di HP Anda.
                </p>
              </div>
            )}

            {sheet === 'feedback' && (
              <div className="space-y-3">
                <div className="flex gap-1.5 justify-center py-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setFeedbackRating(n)}
                      className={`w-11 h-11 rounded-xl border text-sm font-bold ${
                        feedbackRating === n
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-400 border-slate-200'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <textarea
                  value={feedbackMsg}
                  onChange={(e) => setFeedbackMsg(e.target.value)}
                  rows={4}
                  maxLength={1000}
                  placeholder="Apa yang bisa kami perbaiki?"
                  className="w-full p-3.5 rounded-2xl border border-slate-200 text-sm outline-none focus:border-slate-400 resize-none"
                />
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Masukan ini benar-benar anonim. Kami tidak menyimpan nama, nomor meja, maupun
                  kontak Anda — jadi pemilik tidak bisa membalas langsung.
                </p>
                <button
                  disabled={sending}
                  onClick={sendFeedback}
                  className="w-full py-3.5 rounded-2xl bg-slate-900 text-white text-sm font-bold active:bg-slate-800 disabled:opacity-50"
                >
                  Kirim Anonim
                </button>
              </div>
            )}

            {sheet === 'order' && activeOrder && (
              <div className="space-y-3">
                <div className="bg-slate-50 rounded-2xl p-4">
                  <p className="text-xs text-slate-500">
                    {STATUS_LABEL[activeOrder.status] || activeOrder.status}
                  </p>
                  {(activeOrder.status === 'pending' || activeOrder.status === 'preparing') && (
                    <>
                      <p className="text-2xl font-black text-slate-900 mt-1">
                        ± {estimateMinutes(activeOrder.queueAhead)} menit
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {activeOrder.queueAhead === 0
                          ? 'Pesanan Anda sedang dikerjakan'
                          : `Ada ${activeOrder.queueAhead} pesanan di depan Anda`}
                      </p>
                    </>
                  )}
                </div>
                <div className="space-y-1.5">
                  {activeOrder.items.map((it, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-slate-700">
                        {it.quantity}x {it.nameSnapshot}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-slate-200 pt-3">
                  <span>Total</span>
                  <span>{formatRupiah(activeOrder.totalAmount)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <Link
                    href={menuUrl}
                    className="py-3.5 rounded-2xl bg-slate-100 text-slate-800 text-xs font-bold text-center active:bg-slate-200 flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Pesan Lagi
                  </Link>
                  {venue.whatsapp && (
                    <a
                      href={`https://wa.me/?text=${billText}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-3.5 rounded-2xl bg-emerald-500 text-slate-950 text-xs font-bold text-center active:bg-emerald-600 flex items-center justify-center gap-1.5"
                    >
                      <Receipt className="w-3.5 h-3.5" /> Simpan ke WA
                    </a>
                  )}
                </div>
              </div>
            )}

            {sheet === 'info' && (
              <div className="space-y-2.5">
                {venue.address && (
                  <InfoRow icon={<MapPin className="w-4 h-4" />} text={venue.address} />
                )}
                {venue.whatsapp && (
                  <a
                    href={`https://wa.me/${venue.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <InfoRow icon={<Phone className="w-4 h-4" />} text={venue.whatsapp} />
                  </a>
                )}
                {venue.instagramUrl && (
                  <a href={venue.instagramUrl} target="_blank" rel="noopener noreferrer" className="block">
                    <InfoRow icon={<Instagram className="w-4 h-4" />} text="Instagram" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-4 right-4 z-[60] bg-slate-900 text-white text-xs font-semibold px-4 py-3.5 rounded-2xl flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          {toast}
        </div>
      )}
    </div>
  );
}

function Tile({
  icon,
  color,
  title,
  subtitle,
  onClick,
}: {
  icon: React.ReactNode;
  color: string;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-slate-200 rounded-2xl p-4 active:bg-slate-50"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
            {icon}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">{title}</p>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-300" />
      </div>
    </button>
  );
}

function Field({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: (v: string, l: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>
        <p className="text-sm font-mono font-bold text-slate-900 truncate">{value}</p>
      </div>
      <button
        onClick={() => onCopy(value, label)}
        className="shrink-0 px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold active:bg-slate-700 flex items-center gap-1.5"
      >
        <Copy className="w-3.5 h-3.5" /> Salin
      </button>
    </div>
  );
}

function InfoRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
      <span className="text-slate-500">{icon}</span>
      <span className="text-sm text-slate-800">{text}</span>
    </div>
  );
}
