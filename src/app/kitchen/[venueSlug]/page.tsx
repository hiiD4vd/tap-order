'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  Flame,
  Volume2,
  VolumeX,
  RefreshCw,
  ArrowLeft,
  UtensilsCrossed,
  AlertCircle,
  Play,
  Check,
} from 'lucide-react';

type OrderItem = {
  id: string;
  nameSnapshot: string;
  priceSnapshot: number;
  quantity: number;
  notes: string | null;
  selectedOptions: string | null;
};

type Order = {
  id: string;
  orderNumber: string;
  customerName: string | null;
  status: 'pending' | 'preparing' | 'served' | 'completed' | 'cancelled';
  customerNote: string | null;
  createdAt: string;
  table: { number: string; label: string | null } | null;
  items: OrderItem[];
};

export default function KitchenDisplayPage() {
  const params = useParams();
  const venueSlug = params.venueSlug as string;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'preparing'>('all');
  const [currentTime, setCurrentTime] = useState(new Date());

  const audioContextRef = useRef<AudioContext | null>(null);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const playKitchenBell = () => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.2); // C6

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.85);
    } catch (e) {
      console.log('Audio error:', e);
    }
  };

  const fetchKitchenOrders = async () => {
    try {
      const res = await fetch(`/api/orders?venueSlug=${venueSlug}&status=pending,preparing,served`);
      const data = await res.json();
      if (data.success && data.orders) {
        setOrders((prev) => {
          const prevIds = new Set(prev.map((o) => o.id));
          const hasNew = data.orders.some(
            (o: Order) => !prevIds.has(o.id) && o.status === 'pending'
          );
          if (hasNew) {
            playKitchenBell();
          }
          return data.orders;
        });
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKitchenOrders();
    const interval = setInterval(fetchKitchenOrders, 5000);
    return () => clearInterval(interval);
  }, [venueSlug, soundEnabled]);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success && data.order) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: data.order.status } : o))
        );
      }
    } catch {
      alert('Gagal memperbarui status masakan');
    }
  };

  const activeKitchenOrders = orders.filter((o) => ['pending', 'preparing'].includes(o.status));
  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const preparingCount = orders.filter((o) => o.status === 'preparing').length;

  const displayedOrders = activeKitchenOrders.filter((o) => {
    if (filterStatus === 'pending') return o.status === 'pending';
    if (filterStatus === 'preparing') return o.status === 'preparing';
    return true;
  });

  const getElapsedTime = (createdAt: string) => {
    const start = new Date(createdAt).getTime();
    const now = currentTime.getTime();
    const mins = Math.floor((now - start) / 60000);
    return mins;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* KDS Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sticky top-0 z-40 shadow-xl">
        <div className="flex items-center gap-4">
          <Link
            href={`/cashier/${venueSlug}`}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all flex items-center gap-1.5 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Layar Kasir</span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-wide flex items-center gap-2">
                <span>KDS DAPUR</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-mono">
                  LIVE
                </span>
              </h1>
              <p className="text-xs text-slate-400 font-mono">
                {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB
              </p>
            </div>
          </div>
        </div>

        {/* Stats & Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Quick Filter Badges */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                filterStatus === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Semua ({activeKitchenOrders.length})
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                filterStatus === 'pending'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-amber-400 hover:text-white'
              }`}
            >
              Baru ({pendingCount})
            </button>
            <button
              onClick={() => setFilterStatus('preparing')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                filterStatus === 'preparing'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-sky-400 hover:text-white'
              }`}
            >
              Dimasak ({preparingCount})
            </button>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl border transition-all ${
              soundEnabled
                ? 'bg-slate-800 border-slate-700 text-amber-400'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title={soundEnabled ? 'Suara Bel Aktif' : 'Suara Bel Mati'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={fetchKitchenOrders}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Ticket Grid Area */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin mb-3 text-amber-500" />
            <p className="text-sm font-semibold">Memuat tiket dapur...</p>
          </div>
        ) : displayedOrders.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-16 text-center max-w-md mx-auto my-12">
            <UtensilsCrossed className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-200">Semua Masakan Selesai!</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Dapur sedang bersih dari antrean. Tiket pesanan baru dari tamu akan langsung muncul dan berdering di sini.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {displayedOrders.map((order) => {
              const elapsed = getElapsedTime(order.createdAt);
              const isUrgent = elapsed >= 15;
              const isPending = order.status === 'pending';

              return (
                <div
                  key={order.id}
                  className={`bg-slate-900 rounded-3xl border flex flex-col justify-between overflow-hidden shadow-2xl transition-all ${
                    isPending
                      ? 'border-amber-500/80 ring-2 ring-amber-500/30'
                      : 'border-sky-500/60'
                  }`}
                >
                  {/* Ticket Header */}
                  <div
                    className={`p-4 border-b ${
                      isPending
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-sky-500/10 border-sky-500/30'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-black text-white tracking-tight">
                            {order.table ? `MEJA ${order.table.number}` : 'TAKEAWAY'}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-300 mt-0.5">
                          {order.orderNumber} {order.customerName ? `• ${order.customerName}` : ''}
                        </p>
                      </div>

                      {/* Timer Badge */}
                      <div
                        className={`px-2.5 py-1 rounded-xl text-xs font-extrabold flex items-center gap-1.5 font-mono ${
                          isUrgent
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                            : elapsed >= 8
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>{elapsed}m</span>
                      </div>
                    </div>
                  </div>

                  {/* Customer General Note */}
                  {order.customerNote && (
                    <div className="mx-4 mt-3 p-2.5 bg-amber-950/60 border border-amber-600/40 rounded-xl text-amber-200 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <b className="text-amber-300">Catatan Tamu:</b> "{order.customerNote}"
                      </div>
                    </div>
                  )}

                  {/* Items List */}
                  <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-72">
                    {order.items.map((it, idx) => (
                      <div
                        key={it.id || idx}
                        className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-1"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-black text-base text-white leading-tight">
                            {it.nameSnapshot}
                          </span>
                          <span className="text-base font-extrabold px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-lg shrink-0 font-mono border border-emerald-500/30">
                            x{it.quantity}
                          </span>
                        </div>

                        {it.notes && (
                          <div className="text-xs font-bold text-amber-300 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                            ⚠️ "{it.notes}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="p-4 bg-slate-950 border-t border-slate-800/80">
                    {isPending ? (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'preparing')}
                        className="w-full bg-amber-600 hover:bg-amber-500 text-white font-extrabold py-3.5 rounded-2xl text-sm shadow-lg shadow-amber-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                      >
                        <Play className="w-4 h-4 fill-white" />
                        <span>Mulai Masak</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'served')}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3.5 rounded-2xl text-sm shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                      >
                        <Check className="w-5 h-5 stroke-[3]" />
                        <span>Selesai Masak (Siap Saji)</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
