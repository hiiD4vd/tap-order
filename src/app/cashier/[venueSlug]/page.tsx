'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Utensils,
  Bell,
  Receipt,
  CheckCircle2,
  Clock,
  Printer,
  Search,
  Filter,
  Volume2,
  VolumeX,
  CreditCard,
  Banknote,
  QrCode,
  AlertTriangle,
  RefreshCw,
  Plus,
  Minus,
  X,
  Check,
  Flame,
  Coffee,
  UserPlus,
  LogOut,
  ChefHat,
  ArrowRightLeft,
  Ban,
} from 'lucide-react';
import { formatRupiah } from '@/lib/utils';

type Table = {
  id: string;
  number: string;
  label: string | null;
  status: string;
  cardToken: string;
};

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
  subtotal?: number;
  taxAmount?: number;
  serviceAmount?: number;
  totalAmount: number;
  paymentMethod: string;
  isPaid: boolean;
  customerNote: string | null;
  cancelledReason?: string | null;
  createdAt: string;
  table: Table | null;
  items: OrderItem[];
};

type TableRequest = {
  id: string;
  type: string;
  status: string;
  createdAt: string;
  table: Table;
};

export default function CashierScreenPage() {
  const params = useParams();
  const venueSlug = params.venueSlug as string;

  const [venue, setVenue] = useState<any | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [requests, setRequests] = useState<TableRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs & Sound
  const [activeTab, setActiveTab] = useState<'active' | 'all'>('active');
  const [selectedTableFilter, setSelectedTableFilter] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Bill Settlement Modal
  const [billOrder, setBillOrder] = useState<Order | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris' | 'debit'>('cash');
  const [cashAmount, setCashAmount] = useState<string>('');

  // Manual Walk-in Order Modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualTableId, setManualTableId] = useState<string>('');
  const [manualCustomerName, setManualCustomerName] = useState('');
  const [manualItems, setManualItems] = useState<{ [itemId: string]: number }>({});
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  // Transfer Table Modal
  const [transferOrder, setTransferOrder] = useState<Order | null>(null);
  const [targetTableId, setTargetTableId] = useState<string>('');
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);

  // Void Order Modal
  const [voidOrder, setVoidOrder] = useState<Order | null>(null);
  const [voidReason, setVoidReason] = useState<string>('Salah input tamu');
  const [isSubmittingVoid, setIsSubmittingVoid] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);

  const playAlertSound = () => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(659.25, now);
      osc1.frequency.exponentialRampToValueAtTime(830.61, now + 0.15);
      osc2.frequency.setValueAtTime(329.63, now);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.65);
      osc2.stop(now + 0.65);
    } catch (e) {
      console.log('Audio error:', e);
    }
  };

  const fetchData = async () => {
    try {
      const [menuRes, ordersRes, tablesRes] = await Promise.all([
        fetch(`/api/menu/${venueSlug}`),
        fetch(`/api/orders?venueSlug=${venueSlug}`),
        fetch(`/api/venues/${venueSlug}/tables`),
      ]);

      const menuData = await menuRes.json();
      const ordersData = await ordersRes.json();
      const tablesData = await tablesRes.json();

      if (menuData.success && menuData.venue) {
        setVenue(menuData.venue);
      }
      if (ordersData.success && ordersData.orders) {
        setOrders(ordersData.orders);
      }
      if (tablesData.success && tablesData.tables) {
        setTables(tablesData.tables);
        if (tablesData.tables.length > 0 && !manualTableId) {
          setManualTableId(tablesData.tables[0].id);
        }
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch cashier data:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [venueSlug]);

  const [sseConnected, setSseConnected] = useState(false);

  // Real-time SSE Connection
  useEffect(() => {
    if (!venue?.id) return;

    let es: EventSource | null = null;
    let reconnectTimer: any = null;

    const connectSSE = () => {
      es = new EventSource(`/api/stream?venueId=${venue.id}`);

      es.onopen = () => {
        setSseConnected(true);
      };

      es.addEventListener('NEW_ORDER', (e: any) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload?.order) {
            setOrders((prev) => [payload.order, ...prev.filter((o) => o.id !== payload.order.id)]);
            playAlertSound();
          }
        } catch (err) {
          console.error(err);
        }
      });

      es.addEventListener('ORDER_UPDATED', (e: any) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload?.order) {
            setOrders((prev) => prev.map((o) => (o.id === payload.order.id ? payload.order : o)));
          }
        } catch (err) {
          console.error(err);
        }
      });

      es.addEventListener('NEW_REQUEST', (e: any) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload?.request) {
            setRequests((prev) => [payload.request, ...prev]);
            playAlertSound();
          }
        } catch (err) {
          console.error(err);
        }
      });

      es.onerror = () => {
        setSseConnected(false);
        es?.close();
        // Auto reconnect in 3s
        reconnectTimer = setTimeout(connectSSE, 3000);
      };
    };

    connectSSE();

    return () => {
      es?.close();
      clearTimeout(reconnectTimer);
    };
  }, [venue?.id, soundEnabled]);

  // Robust Fallback Polling (Every 6 seconds) - guarantees updates even if SSE drops
  useEffect(() => {
    if (!venueSlug) return;

    const pollInterval = setInterval(async () => {
      try {
        // Hari ini saja: order lama sudah selesai dan tidak perlu ikut tiap poll.
        const since = new Date();
        since.setHours(0, 0, 0, 0);
        const [ordersRes, requestsRes] = await Promise.all([
          fetch(`/api/orders?venueSlug=${venueSlug}&from=${since.toISOString()}`),
          fetch(`/api/requests?venueSlug=${venueSlug}`),
        ]);
        const ordersData = await ordersRes.json();
        const requestsData = await requestsRes.json();

        if (ordersData.success && ordersData.orders) {
          setOrders((prev) => {
            const prevIds = new Set(prev.map((o) => o.id));
            const hasNew = ordersData.orders.some(
              (o: any) => !prevIds.has(o.id) && ['pending', 'preparing'].includes(o.status)
            );
            if (hasNew) {
              playAlertSound();
            }
            return ordersData.orders;
          });
        }

        if (requestsData.success && requestsData.requests) {
          setRequests(requestsData.requests);
        }
      } catch {
        // Silent network fallback
      }
    }, 6000);

    return () => clearInterval(pollInterval);
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
        setOrders((prev) => prev.map((o) => (o.id === orderId ? data.order : o)));
      }
    } catch {
      alert('Gagal memperbarui status pesanan');
    }
  };

  const handleSettleBill = async () => {
    if (!billOrder) return;

    try {
      const res = await fetch(`/api/orders/${billOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          isPaid: true,
          paymentMethod,
        }),
      });
      const data = await res.json();
      if (data.success && data.order) {
        setOrders((prev) => prev.map((o) => (o.id === billOrder.id ? data.order : o)));
        const givenCash = paymentMethod === 'cash' ? parseInt(cashAmount) || undefined : undefined;
        // Immediate receipt print prompt
        handlePrintReceipt(data.order, givenCash);
        setBillOrder(null);
        setCashAmount('');
        fetchData(); // refresh table statuses
      }
    } catch {
      alert('Gagal memproses pembayaran');
    }
  };

  const handleTransferTable = async () => {
    if (!transferOrder || !targetTableId) return;
    setIsSubmittingTransfer(true);
    try {
      const res = await fetch(`/api/orders/${transferOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newTableId: targetTableId }),
      });
      const data = await res.json();
      if (data.success && data.order) {
        setOrders((prev) => prev.map((o) => (o.id === transferOrder.id ? data.order : o)));
        setTransferOrder(null);
        setTargetTableId('');
        fetchData();
      } else {
        alert(data.error || 'Gagal memindahkan meja');
      }
    } catch {
      alert('Terjadi kesalahan saat memindahkan meja');
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  const handleVoidOrder = async () => {
    if (!voidOrder) return;
    setIsSubmittingVoid(true);
    try {
      const res = await fetch(`/api/orders/${voidOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled', cancelledReason: voidReason }),
      });
      const data = await res.json();
      if (data.success && data.order) {
        setOrders((prev) => prev.map((o) => (o.id === voidOrder.id ? data.order : o)));
        setVoidOrder(null);
        fetchData();
      } else {
        alert(data.error || 'Gagal membatalkan pesanan');
      }
    } catch {
      alert('Terjadi kesalahan saat membatalkan pesanan');
    } finally {
      setIsSubmittingVoid(false);
    }
  };

  const handleResolveRequest = async (requestId: string) => {
    try {
      await fetch('/api/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, status: 'resolved' }),
      });
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch {
      alert('Gagal menyelesaikan permintaan');
    }
  };

  const handlePrintReceipt = (order: Order, cashGiven?: number) => {
    const printWindow = window.open('', '_blank', 'width=360,height=600');
    if (!printWindow) return;

    const subtotal = order.subtotal || order.items.reduce((acc, it) => acc + it.priceSnapshot * it.quantity, 0);
    const tax = order.taxAmount || 0;
    const service = order.serviceAmount || 0;
    const change = cashGiven ? Math.max(0, cashGiven - order.totalAmount) : 0;

    const receiptHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Struk ${order.orderNumber}</title>
        <style>
          @page { margin: 0; size: 58mm auto; }
          body { font-family: monospace; font-size: 12px; margin: 10px; color: #000; line-height: 1.35; }
          .center { text-align: center; }
          .right { text-align: right; }
          .line { border-bottom: 1px dashed #000; margin: 6px 0; }
          .bold { font-weight: bold; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          td { vertical-align: top; padding: 2px 0; }
        </style>
      </head>
      <body>
        <div class="center bold" style="font-size:14px">${venue?.name || 'Tap-Order'}</div>
        <div class="center" style="font-size:10px">${venue?.address || ''}</div>
        <div class="line"></div>
        <div>No: ${order.orderNumber}</div>
        <div>Meja: ${order.table ? order.table.number : 'Pesan Langsung'}</div>
        <div>Tamu: ${order.customerName || '-'}</div>
        <div>Waktu: ${new Date(order.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
        <div class="line"></div>
        <table>
          ${order.items
            .map(
              (it) => `
            <tr>
              <td colspan="2" class="bold">${it.nameSnapshot}</td>
            </tr>
            <tr>
              <td>${it.quantity} x ${it.priceSnapshot.toLocaleString('id-ID')}</td>
              <td class="right">${(it.quantity * it.priceSnapshot).toLocaleString('id-ID')}</td>
            </tr>
            ${it.notes ? `<tr><td colspan="2" style="font-size:9px; font-style:italic">"${it.notes}"</td></tr>` : ''}
          `
            )
            .join('')}
        </table>
        <div class="line"></div>
        <table>
          <tr>
            <td>Subtotal:</td>
            <td class="right">Rp ${subtotal.toLocaleString('id-ID')}</td>
          </tr>
          ${tax > 0 ? `<tr><td>PB1 (10%):</td><td class="right">Rp ${tax.toLocaleString('id-ID')}</td></tr>` : ''}
          ${service > 0 ? `<tr><td>Service:</td><td class="right">Rp ${service.toLocaleString('id-ID')}</td></tr>` : ''}
        </table>
        <div class="line"></div>
        <table class="bold" style="font-size:13px">
          <tr>
            <td>TOTAL:</td>
            <td class="right">Rp ${order.totalAmount.toLocaleString('id-ID')}</td>
          </tr>
          <tr>
            <td style="font-size:10px; font-weight:normal">Metode:</td>
            <td class="right" style="font-size:10px; font-weight:normal">${order.isPaid ? order.paymentMethod.toUpperCase() : 'BELUM LUNAS'}</td>
          </tr>
          ${cashGiven ? `
          <tr>
            <td style="font-size:10px; font-weight:normal">Tunai Diterima:</td>
            <td class="right" style="font-size:10px; font-weight:normal">Rp ${cashGiven.toLocaleString('id-ID')}</td>
          </tr>
          <tr>
            <td style="font-size:10px; font-weight:normal">Kembalian:</td>
            <td class="right" style="font-size:10px; font-weight:normal">Rp ${change.toLocaleString('id-ID')}</td>
          </tr>
          ` : ''}
        </table>
        <div class="line"></div>
        <div class="center" style="font-size:10px; margin-top:10px">Terima kasih atas kunjungannya!</div>
        <div class="center" style="font-size:9px; color:#555">Powered by Tap-Order</div>
      </body>
      </html>
    `;

    printWindow.document.write(receiptHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // Submit Manual Walk-in Order
  const handleSubmitManualOrder = async () => {
    const selectedList = Object.entries(manualItems)
      .filter(([_, qty]) => qty > 0)
      .map(([itemId, qty]) => ({
        menuItemId: itemId,
        quantity: qty,
      }));

    if (selectedList.length === 0) {
      alert('Pilih minimal 1 menu item terlebih dahulu!');
      return;
    }

    setIsSubmittingManual(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venueId: venue.id,
          tableId: manualTableId || null,
          customerName: manualCustomerName.trim() || 'Tamu Kasir (Walk-in)',
          items: selectedList,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsManualModalOpen(false);
        setManualItems({});
        setManualCustomerName('');
        fetchData();
      } else {
        alert(data.error || 'Gagal membuat pesanan manual');
      }
    } catch {
      alert('Terjadi kesalahan saat memproses pesanan');
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const activeOrders = orders.filter((o) => ['pending', 'preparing', 'served'].includes(o.status));
  const displayedOrders = (activeTab === 'active' ? activeOrders : orders).filter((o) => {
    if (!selectedTableFilter) return true;
    return o.table?.number === selectedTableFilter;
  });

  const allMenuItems = venue?.categories?.flatMap((c: any) => c.menuItems) || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3.5 flex items-center justify-between sticky top-0 z-40 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center font-bold text-white shadow-md">
            K
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base text-white">{venue?.name || 'Kasir & Dapur'}</h1>
              {sseConnected ? (
                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE SSE
                </span>
              ) : (
                <span className="bg-amber-500/20 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> AUTO-POLL (6s)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">Layar Kasir & Dapur Real-time</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <Link
            href={`/kitchen/${venueSlug}`}
            className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
            title="Buka Layar KDS Dapur Khusus Koki"
          >
            <ChefHat className="w-4 h-4" />
            <span className="hidden sm:inline">KDS Dapur</span>
          </Link>

          <button
            onClick={() => setIsManualModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">+ Input Pesanan Manual</span>
          </button>

          <button
            onClick={() => setSoundEnabled((s) => !s)}
            className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              soundEnabled
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={() => fetchData()}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-all active:scale-95"
            title="Muat Ulang Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={async () => {
              await fetch('/api/logout', { method: 'POST' });
              window.location.href = `/login?type=cashier&slug=${venueSlug}`;
            }}
            className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
            title="Kunci Layar Kasir"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Kunci</span>
          </button>
        </div>
      </header>

      {/* Table Requests Notification Banner */}
      {requests.length > 0 && (
        <div className="bg-amber-950/80 border-b border-amber-600/40 px-6 py-2.5 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2 flex-wrap">
            <Bell className="w-4 h-4 text-amber-400 animate-bounce shrink-0" />
            <span className="font-bold">Permintaan Meja:</span>
            {requests.map((r) => (
              <span key={r.id} className="bg-amber-900/60 px-2.5 py-1 rounded-lg border border-amber-700/50 flex items-center gap-1.5">
                <span>
                  <b>Meja {r.table.number}</b> {({ waiter: 'Panggil Pelayan', tissue: 'Minta Tisu', water: 'Air Putih', condiment: 'Sambal / Kecap', clean: 'Bersihkan Meja' } as Record<string, string>)[r.type] || 'Minta Bantuan'}
                </span>
                <button
                  onClick={() => handleResolveRequest(r.id)}
                  className="w-4 h-4 rounded-full bg-amber-700 hover:bg-amber-600 text-white flex items-center justify-center font-bold"
                >
                  <Check className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Navigation Tabs & Filter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'active'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Pesanan Aktif ({activeOrders.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-xl font-bold transition-all ${
                activeTab === 'all'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Semua Pesanan ({orders.length})
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1">
            <span className="text-xs text-slate-400 font-medium">Filter Meja:</span>
            <button
              onClick={() => setSelectedTableFilter(null)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedTableFilter === null ? 'bg-slate-700 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
              }`}
            >
              Semua
            </button>
            {tables.map((tbl) => (
              <button
                key={tbl.id}
                onClick={() => setSelectedTableFilter(tbl.number)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedTableFilter === tbl.number
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                }`}
              >
                M{tbl.number}
              </button>
            ))}
          </div>
        </div>

        {/* Orders Queue Grid */}
        {displayedOrders.length === 0 ? (
          <div className="bg-slate-900/50 rounded-3xl p-12 text-center border border-slate-800/80">
            <Coffee className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-300">Belum Ada Pesanan Antrean</h3>
            <p className="text-slate-500 text-xs mt-1">
              Pesanan baru dari tamu yang tap meja akan otomatis berbunyi dan muncul di sini secara real-time.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedOrders.map((order) => {
              const isPending = order.status === 'pending';
              const isPreparing = order.status === 'preparing';
              const isServed = order.status === 'served';

              return (
                <div
                  key={order.id}
                  className={`bg-slate-900 rounded-2xl border p-4.5 flex flex-col justify-between transition-all ${
                    isPending
                      ? 'border-amber-500/70 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/40'
                      : isPreparing
                      ? 'border-sky-500/50'
                      : isServed
                      ? 'border-emerald-500/40'
                      : 'border-slate-800 opacity-60'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between pb-3 border-b border-slate-800/80">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-base text-white">{order.orderNumber}</span>
                          <span
                            className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                              isPending
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                                : isPreparing
                                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                : isServed
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {isPending ? 'Baru Masuk' : isPreparing ? 'Sedang Masak' : isServed ? 'Disajikan' : 'Selesai'}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-emerald-400 mt-1">
                          {order.table ? `Meja ${order.table.number}` : 'Pesan Langsung'}
                          {order.customerName ? ` • ${order.customerName}` : ''}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(order.createdAt).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <p className="text-xs font-extrabold text-white mt-1">{formatRupiah(order.totalAmount)}</p>
                      </div>
                    </div>

                    {order.customerNote && (
                      <div className="my-2.5 p-2 bg-amber-950/40 border border-amber-600/30 rounded-xl text-amber-200 text-xs">
                        <b>Catatan:</b> "{order.customerNote}"
                      </div>
                    )}

                    <div className="py-3 space-y-2 text-xs">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-start justify-between">
                          <div>
                            <span className="font-bold text-slate-200">
                              {item.quantity}x {item.nameSnapshot}
                            </span>
                            {item.notes && <p className="text-[11px] text-amber-300 italic">"{item.notes}"</p>}
                          </div>
                          <span className="text-slate-400 font-medium">
                            {formatRupiah(item.priceSnapshot * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 space-y-2 mt-2">
                    <div className="grid grid-cols-2 gap-2">
                      {isPending && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'preparing')}
                          className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 rounded-xl text-xs transition-all active:scale-95"
                        >
                          Terima & Masak
                        </button>
                      )}

                      {isPreparing && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'served')}
                          className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 rounded-xl text-xs transition-all active:scale-95"
                        >
                          Siap Disajikan
                        </button>
                      )}

                      {(isServed || isPreparing || isPending) && (
                        <button
                          onClick={() => setBillOrder(order)}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl text-xs transition-all active:scale-95"
                        >
                          {order.isPaid ? 'Tutup Meja' : 'Bayar & Selesai'}
                        </button>
                      )}

                      <button
                        onClick={() => handlePrintReceipt(order)}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold py-2 rounded-xl text-xs border border-slate-700 flex items-center justify-center gap-1.5 transition-all active:scale-95"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Cetak Struk</span>
                      </button>
                    </div>

                    {/* Secondary Actions: Pindah Meja & Void */}
                    {['pending', 'preparing', 'served'].includes(order.status) && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={() => {
                            setTransferOrder(order);
                            setTargetTableId('');
                          }}
                          className="w-full bg-slate-800/80 hover:bg-slate-700 text-sky-400 hover:text-sky-300 font-semibold py-1.5 rounded-xl text-[11px] border border-slate-700/80 flex items-center justify-center gap-1.5 transition-all active:scale-95"
                          title="Pindahkan Pesanan ke Meja Lain"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          <span>Pindah Meja</span>
                        </button>
                        <button
                          onClick={() => {
                            setVoidOrder(order);
                            setVoidReason('Salah input tamu');
                          }}
                          className="w-full bg-slate-800/80 hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 font-semibold py-1.5 rounded-xl text-[11px] border border-slate-700/80 flex items-center justify-center gap-1.5 transition-all active:scale-95"
                          title="Batalkan Pesanan (Void)"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Void / Batal</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bill Settlement Modal */}
      {billOrder && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-slate-100 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-lg text-white">Pelunasan Tagihan Kasir</h3>
                <p className="text-xs text-slate-400">
                  {billOrder.orderNumber} • {billOrder.table ? `Meja ${billOrder.table.number}` : 'Pesan Langsung'}
                </p>
              </div>
              <button
                onClick={() => setBillOrder(null)}
                className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center">
              <span className="text-xs text-slate-400 uppercase font-semibold">Total yang Harus Dibayar</span>
              <p className="text-3xl font-black text-emerald-400 mt-1">{formatRupiah(billOrder.totalAmount)}</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400">Metode Pembayaran:</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-3 rounded-xl border text-center text-xs font-bold transition-all ${
                    paymentMethod === 'cash'
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <Banknote className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
                  Tunai
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('qris')}
                  className={`p-3 rounded-xl border text-center text-xs font-bold transition-all ${
                    paymentMethod === 'qris'
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <QrCode className="w-5 h-5 mx-auto mb-1 text-sky-400" />
                  QRIS Statis
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('debit')}
                  className={`p-3 rounded-xl border text-center text-xs font-bold transition-all ${
                    paymentMethod === 'debit'
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <CreditCard className="w-5 h-5 mx-auto mb-1 text-amber-400" />
                  Debit / EDC
                </button>
              </div>
            </div>

            {paymentMethod === 'cash' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400">Uang Diterima dari Tamu (Rp):</label>
                <input
                  type="number"
                  placeholder="Misal: 100000"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-mono text-base focus:border-emerald-500 focus:outline-none"
                />
                {parseInt(cashAmount) >= billOrder.totalAmount && (
                  <div className="p-2.5 bg-emerald-950/40 border border-emerald-800/50 rounded-xl text-xs flex justify-between">
                    <span className="text-emerald-300">Kembalian:</span>
                    <span className="font-extrabold text-emerald-400">
                      {formatRupiah(parseInt(cashAmount) - billOrder.totalAmount)}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="pt-2">
              <button
                onClick={handleSettleBill}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 rounded-xl text-sm shadow-xl transition-all active:scale-[0.99] flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Konfirmasi Lunas & Tutup Meja</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Walk-in Order Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-100 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-black text-base text-white">+ Input Pesanan Tamu Datang (Manual)</h3>
                <p className="text-xs text-slate-400">Untuk tamu yang langsung pesan di meja kasir</p>
              </div>
              <button onClick={() => setIsManualModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Pilih Meja</label>
                  <select
                    value={manualTableId}
                    onChange={(e) => setManualTableId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="">Bungkus / Takeaway</option>
                    {tables.map((t) => (
                      <option key={t.id} value={t.id}>Meja {t.number} ({t.label || 'Area'})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Nama Tamu (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Misal: Pak Hendro"
                    value={manualCustomerName}
                    onChange={(e) => setManualCustomerName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-2">Pilih Menu & Jumlah</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                  {allMenuItems.map((item: any) => {
                    const qty = manualItems[item.id] || 0;
                    return (
                      <div key={item.id} className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-white text-xs truncate">{item.name}</p>
                          <p className="text-[11px] text-emerald-400">{formatRupiah(item.price)}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setManualItems((prev) => ({ ...prev, [item.id]: Math.max(0, qty - 1) }))}
                            className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-bold min-w-4 text-center">{qty}</span>
                          <button
                            type="button"
                            onClick={() => setManualItems((prev) => ({ ...prev, [item.id]: qty + 1 }))}
                            className="w-6 h-6 rounded bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center text-white"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
              <button
                type="button"
                onClick={handleSubmitManualOrder}
                disabled={isSubmittingManual}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-md"
              >
                {isSubmittingManual ? 'Memproses...' : 'Kirim Pesanan ke Dapur & Kasir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Table Modal */}
      {transferOrder && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 text-slate-100 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-sky-400" />
                <h3 className="font-extrabold text-base text-white">Pindah Meja</h3>
              </div>
              <button onClick={() => setTransferOrder(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-2">
              <p>
                Pindahkan pesanan <span className="font-bold text-white">{transferOrder.orderNumber}</span> dari:
              </p>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-bold text-emerald-400">
                {transferOrder.table ? `Meja ${transferOrder.table.number}` : 'Pesanan Tanpa Meja'}
              </div>

              <label className="block pt-2 font-bold text-slate-300">Pilih Meja Tujuan Baru:</label>
              <select
                value={targetTableId}
                onChange={(e) => setTargetTableId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs font-semibold focus:border-sky-500 focus:outline-none"
              >
                <option value="">-- Pilih Meja Tujuan --</option>
                {tables
                  .filter((t) => t.id !== transferOrder.table?.id)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      Meja {t.number} ({t.status === 'empty' ? 'Kosong' : 'Ada Tamu'})
                    </option>
                  ))}
              </select>
            </div>

            <div className="pt-2">
              <button
                disabled={!targetTableId || isSubmittingTransfer}
                onClick={handleTransferTable}
                className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-2"
              >
                {isSubmittingTransfer ? 'Memindahkan...' : 'Konfirmasi Pindah Meja'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Void / Cancel Order Modal */}
      {voidOrder && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-900/50 rounded-3xl max-w-sm w-full p-6 text-slate-100 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-rose-400">
                <Ban className="w-5 h-5" />
                <h3 className="font-extrabold text-base text-white">Batalkan Pesanan (Void)</h3>
              </div>
              <button onClick={() => setVoidOrder(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-3">
              <p className="text-rose-300 bg-rose-950/40 border border-rose-800/40 p-3 rounded-xl">
                ⚠️ Anda akan membatalkan <b>{voidOrder.orderNumber}</b> ({formatRupiah(voidOrder.totalAmount)}). Tindakan ini akan tercatat di log audit sistem.
              </p>

              <div>
                <label className="block font-bold text-slate-300 mb-1.5">Alasan Pembatalan:</label>
                <select
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs focus:border-rose-500 focus:outline-none"
                >
                  <option value="Salah input tamu / kasir">Salah input tamu / kasir</option>
                  <option value="Bahan baku / menu habis">Bahan baku / menu habis</option>
                  <option value="Tamu membatalkan pesanan">Tamu membatalkan pesanan</option>
                  <option value="Tamu meninggalkan tempat">Tamu meninggalkan tempat</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
            </div>

            <div className="pt-2">
              <button
                disabled={isSubmittingVoid}
                onClick={handleVoidOrder}
                className="w-full bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-2"
              >
                {isSubmittingVoid ? 'Membatalkan...' : 'Ya, Batalkan Pesanan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
