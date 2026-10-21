'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Utensils,
  Store,
  DollarSign,
  TrendingUp,
  ShoppingBag,
  QrCode,
  CheckCircle2,
  XCircle,
  Smartphone,
  ExternalLink,
  Printer,
  Sparkles,
  Plus,
  Trash2,
  X,
  Check,
  ArrowUpRight,
  RefreshCw,
  Edit2,
  Table as TableIcon,
  Settings,
  Download,
  Phone,
  MapPin,
  Lock,
  LogOut,
  BarChart3,
} from 'lucide-react';
import { formatRupiah } from '@/lib/utils';

function Metric({ label, value, danger = false }: { label: string; value: string | number; danger?: boolean }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4">
      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-black mt-1 ${danger ? 'text-rose-600' : 'text-slate-900'}`}>{value}</p>
    </div>
  );
}

export default function OwnerDashboardPage() {
  const params = useParams();
  const venueSlug = params.venueSlug as string;

  const [venue, setVenue] = useState<any | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [summary, setSummary] = useState<{
    paidCount: number;
    paidRevenue: number;
    cashRevenue: number;
    qrisRevenue: number;
    unclassifiedCount: number;
    unclassifiedRevenue: number;
  } | null>(null);
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'menu' | 'tables' | 'audit' | 'analytics' | 'settings'>('overview');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [tapAnalytics, setTapAnalytics] = useState<any | null>(null);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);

  // Outlet Settings state
  const [settingsName, setSettingsName] = useState('');
  const [settingsWhatsapp, setSettingsWhatsapp] = useState('');
  const [settingsAddress, setSettingsAddress] = useState('');
  const [settingsPin, setSettingsPin] = useState('');
  const [settingsTaxRate, setSettingsTaxRate] = useState('0');
  const [settingsServiceRate, setSettingsServiceRate] = useState('0');
  const [settingsQrisUrl, setSettingsQrisUrl] = useState('');
  const [settingsWifiSsid, setSettingsWifiSsid] = useState('');
  const [settingsWifiPassword, setSettingsWifiPassword] = useState('');
  const [settingsGmapsReviewUrl, setSettingsGmapsReviewUrl] = useState('');
  const [settingsInstagramUrl, setSettingsInstagramUrl] = useState('');
  const [settingsAnnouncement, setSettingsAnnouncement] = useState('');
  const [settingsIsOpen, setSettingsIsOpen] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Modals state
  const [isAddMenuModalOpen, setIsAddMenuModalOpen] = useState(false);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [isAddTableModalOpen, setIsAddTableModalOpen] = useState(false);

  // Form states for Add Menu Item
  const [newMenuCategoryId, setNewMenuCategoryId] = useState('');
  const [newMenuName, setNewMenuName] = useState('');
  const [newMenuPrice, setNewMenuPrice] = useState('');
  const [newMenuDesc, setNewMenuDesc] = useState('');
  const [newMenuImage, setNewMenuImage] = useState('');
  const [isSubmittingItem, setIsSubmittingItem] = useState(false);

  // Form states for Add Category
  const [newCatName, setNewCatName] = useState('');
  const [isSubmittingCat, setIsSubmittingCat] = useState(false);

  // Form states for Add Table
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newTableLabel, setNewTableLabel] = useState('Indoor');
  const [isSubmittingTable, setIsSubmittingTable] = useState(false);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchDashboardData = async (initialLoad = false) => {
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
        setSettingsName(menuData.venue.name || '');
        setSettingsWhatsapp(menuData.venue.whatsapp || '');
        setSettingsAddress(menuData.venue.address || '');
        setSettingsPin(menuData.venue.pinCashier || '1234');
        setSettingsTaxRate((menuData.venue.taxRate ?? 0).toString());
        setSettingsServiceRate((menuData.venue.serviceRate ?? 0).toString());
        setSettingsQrisUrl(menuData.venue.qrisImageUrl || '');
        setSettingsWifiSsid(menuData.venue.wifiSsid || '');
        setSettingsWifiPassword(menuData.venue.wifiPassword || '');
        setSettingsGmapsReviewUrl(menuData.venue.gmapsReviewUrl || '');
        setSettingsInstagramUrl(menuData.venue.instagramUrl || '');
        setSettingsAnnouncement(menuData.venue.announcement || '');
        setSettingsIsOpen(menuData.venue.isOpen !== false);
        if (menuData.venue.categories.length > 0 && !newMenuCategoryId) {
          setNewMenuCategoryId(menuData.venue.categories[0].id);
        }
      }
      if (ordersData.success && ordersData.orders) {
        setOrders(ordersData.orders);
      }
      // Omset dari endpoint terpisah: tidak perlu di-fetch tiap polling 6 detik.
      if (initialLoad) {
        const summaryRes = await fetch('/api/orders/summary');
        const summaryData = await summaryRes.json();
        if (summaryData.success) setSummary(summaryData.summary);
      }
      if (tablesData.success && tablesData.tables) {
        setTables(tablesData.tables);
      }
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(true);
  }, [venueSlug]);

  const loadHubAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const [analyticsRes, feedbackRes] = await Promise.all([
        fetch(`/api/venues/${venueSlug}/tap-analytics?days=7`),
        fetch('/api/feedback?take=50'),
      ]);
      const analyticsData = await analyticsRes.json();
      const feedbackData = await feedbackRes.json();
      if (analyticsData.success) setTapAnalytics(analyticsData);
      if (feedbackData.success) setFeedbacks(feedbackData.feedbacks);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // 1-Click Out-of-Stock Toggle
  const handleToggleAvailable = async (itemId: string, currentStatus: boolean) => {
    try {
      // Optimistic update
      setVenue((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          categories: prev.categories.map((cat: any) => ({
            ...cat,
            menuItems: cat.menuItems.map((m: any) =>
              m.id === itemId ? { ...m, isAvailable: !currentStatus } : m
            ),
          })),
        };
      });

      const res = await fetch(`/api/venues/${venueSlug}/menu-items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, isAvailable: !currentStatus }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(!currentStatus ? '✓ Menu ditandai Tersedia' : '✓ Menu ditandai Habis');
      }
    } catch {
      alert('Gagal mengubah status ketersediaan menu');
      fetchDashboardData();
    }
  };

  // Delete Menu Item
  const handleDeleteMenuItem = async (itemId: string, itemName: string) => {
    if (!confirm(`Hapus menu "${itemName}"?`)) return;

    try {
      const res = await fetch(`/api/venues/${venueSlug}/menu-items?itemId=${itemId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Menu "${itemName}" berhasil dihapus`);
        fetchDashboardData();
      }
    } catch {
      alert('Gagal menghapus menu');
    }
  };

  // Add Menu Item Submit
  const handleCreateMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMenuName || !newMenuPrice || !newMenuCategoryId) return;

    setIsSubmittingItem(true);
    try {
      const res = await fetch(`/api/venues/${venueSlug}/menu-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: newMenuCategoryId,
          name: newMenuName,
          price: parseInt(newMenuPrice),
          description: newMenuDesc,
          imageUrl: newMenuImage,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`✓ Menu baru "${newMenuName}" berhasil dibuat!`);
        setIsAddMenuModalOpen(false);
        setNewMenuName('');
        setNewMenuPrice('');
        setNewMenuDesc('');
        setNewMenuImage('');
        fetchDashboardData();
      } else {
        alert(data.error || 'Gagal membuat menu');
      }
    } catch {
      alert('Terjadi kesalahan saat menyimpan menu');
    } finally {
      setIsSubmittingItem(false);
    }
  };

  // Add Category Submit
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName) return;

    setIsSubmittingCat(true);
    try {
      const res = await fetch(`/api/venues/${venueSlug}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCatName }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✓ Kategori "${newCatName}" berhasil ditambahkan!`);
        setIsAddCategoryModalOpen(false);
        setNewCatName('');
        fetchDashboardData();
      }
    } catch {
      alert('Gagal membuat kategori');
    } finally {
      setIsSubmittingCat(false);
    }
  };

  // Add Table Submit
  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableNumber) return;

    setIsSubmittingTable(true);
    try {
      const res = await fetch(`/api/venues/${venueSlug}/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: newTableNumber, label: newTableLabel }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✓ Meja ${newTableNumber} berhasil ditambahkan!`);
        setIsAddTableModalOpen(false);
        setNewTableNumber('');
        fetchDashboardData();
      } else {
        alert(data.error || 'Gagal menambah meja');
      }
    } catch {
      alert('Gagal menambah meja');
    } finally {
      setIsSubmittingTable(false);
    }
  };

  // Delete Table
  const handleDeleteTable = async (tableId: string, tableNumber: string) => {
    if (!confirm(`Hapus Meja ${tableNumber}?`)) return;

    try {
      const res = await fetch(`/api/venues/${venueSlug}/tables?tableId=${tableId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Meja ${tableNumber} dihapus`);
        fetchDashboardData();
      }
    } catch {
      alert('Gagal menghapus meja');
    }
  };

  // Financial Metrics
  const paidOrders = orders.filter((o) => o.isPaid || o.status === 'completed');
  // Update Venue Settings
  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const res = await fetch(`/api/venues/${venueSlug}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: settingsName,
          whatsapp: settingsWhatsapp,
          address: settingsAddress,
          pinCashier: settingsPin,
          taxRate: parseInt(settingsTaxRate) || 0,
          serviceRate: parseInt(settingsServiceRate) || 0,
          qrisImageUrl: settingsQrisUrl,
          wifiSsid: settingsWifiSsid,
          wifiPassword: settingsWifiPassword,
          gmapsReviewUrl: settingsGmapsReviewUrl,
          instagramUrl: settingsInstagramUrl,
          announcement: settingsAnnouncement,
          isOpen: settingsIsOpen,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('✓ Pengaturan outlet, pajak & operasional berhasil disimpan!');
        fetchDashboardData();
      } else {
        alert(data.error || 'Gagal menyimpan pengaturan');
      }
    } catch {
      alert('Terjadi kesalahan koneksi');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const loadAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const res = await fetch(`/api/venues/${venueSlug}/audit-logs?take=100`);
      const data = await res.json();
      if (data.success) setAuditLogs(data.logs);
    } catch (e) {
      console.error(e);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'audit') loadAuditLogs();
  }, [activeTab]);

  // Angka uang diambil dari agregat server (summary), bukan dari 100 order
  // teratas yang di-fetch — kalau tidak, omset undercount di hari sibuk.
  const totalOmset = summary?.paidRevenue ?? paidOrders.reduce((acc, o) => acc + o.totalAmount, 0);
  const cashOmset = summary?.cashRevenue ?? paidOrders.filter((o) => o.paymentMethod === 'cash').reduce((acc, o) => acc + o.totalAmount, 0);
  const qrisOmset = summary?.qrisRevenue ?? paidOrders.filter((o) => o.paymentMethod === 'qris').reduce((acc, o) => acc + o.totalAmount, 0);
  const paidCount = summary?.paidCount ?? paidOrders.length;

  // Sisa metode. Diambil dari server supaya order lunas lama berlabel 'cashier'
  // kelihatan angkanya, bukan tersembunyi sebagai selisih.
  const otherOmset = summary?.unclassifiedRevenue ?? totalOmset - cashOmset - qrisOmset;

  // Calculate Top Best Sellers
  const itemSalesMap = new Map<string, { name: string; totalQty: number; totalRevenue: number }>();
  for (const order of paidOrders) {
    for (const item of order.items || []) {
      const key = item.nameSnapshot;
      if (!key) continue;
      const existing = itemSalesMap.get(key) || { name: key, totalQty: 0, totalRevenue: 0 };
      existing.totalQty += item.quantity || 1;
      existing.totalRevenue += (item.priceSnapshot || 0) * (item.quantity || 1);
      itemSalesMap.set(key, existing);
    }
  }
  const topBestSellers = Array.from(itemSalesMap.values())
    .sort((a, b) => b.totalQty - a.totalQty)
    .slice(0, 5);

  // Calculate Peak Hours (08:00 to 22:00)
  const hourlyOrders: { [hour: number]: number } = {};
  for (let h = 8; h <= 22; h++) hourlyOrders[h] = 0;
  for (const order of orders) {
    const d = new Date(order.createdAt);
    const hour = d.getHours();
    if (hour >= 8 && hour <= 22) {
      hourlyOrders[hour] = (hourlyOrders[hour] || 0) + 1;
    }
  }
  const maxOrdersInAnHour = Math.max(1, ...Object.values(hourlyOrders));

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 animate-bounce">
          <div className="bg-slate-900 text-white px-5 py-2.5 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2 border border-slate-700">
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-lg">
              {venue?.name ? venue.name.charAt(0) : 'T'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base text-slate-900">{venue?.name}</h1>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                  {venue?.subscriptionTier || 'Pro'}
                </span>
              </div>
              <p className="text-xs text-slate-500">Owner Dashboard & Manajemen Menu</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href={`/kitchen/${venueSlug}`}
              target="_blank"
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
              title="Buka Layar Kitchen Display System untuk tim dapur"
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>Layar KDS Dapur</span>
            </Link>

            <Link
              href={`/cashier/${venueSlug}`}
              target="_blank"
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <span>Buka Layar Kasir</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>

            <button
              onClick={async () => {
                await fetch('/api/logout', { method: 'POST' });
                window.location.href = `/login?slug=${venueSlug}`;
              }}
              className="px-3.5 py-2.5 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
              title="Keluar dari akun pemilik"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto p-6 w-full space-y-6 flex-1">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'overview'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              Ringkasan Omset
            </button>
            <button
              onClick={() => setActiveTab('menu')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'menu'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              Katalog & Saklar Stok Menu
            </button>
            <button
              onClick={() => setActiveTab('tables')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'tables'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              Meja & Kartu NFC ({tables.length})
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'audit'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              Riwayat Aksi
            </button>
            <button
              onClick={() => { setActiveTab('analytics'); loadHubAnalytics(); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'analytics'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Hub & Masukan</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'settings'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Pengaturan Outlet</span>
            </button>
          </div>

          {activeTab === 'menu' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAddCategoryModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Kategori</span>
              </button>
              <button
                onClick={() => setIsAddMenuModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Menu Baru</span>
              </button>
            </div>
          )}

          {activeTab === 'tables' && (
            <div className="flex items-center gap-2">
              <Link
                href={`/admin/${venueSlug}/print-qr`}
                target="_blank"
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                <span>Cetak Lembar Kartu QR Meja</span>
              </Link>
              <button
                onClick={() => setIsAddTableModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Tambah Meja</span>
              </button>
            </div>
          )}
        </div>

        {/* Tab 1: Overview & Financial Report */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-1">
              <div>
                <h2 className="text-sm font-extrabold text-slate-800">Performa Keuangan & Penjualan</h2>
                <p className="text-xs text-slate-500">Rekap omset harian dan transaksi lunas kasir</p>
              </div>
              <a
                href={`/api/venues/${venueSlug}/export-sales`}
                download
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Laporan Excel (CSV)</span>
              </a>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-600" /> Total Pemasukan Lunas
                </span>
                <p className="text-2xl font-black text-slate-900">{formatRupiah(totalOmset)}</p>
                <p className="text-[11px] text-slate-400">{paidCount} transaksi selesai</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Uang Tunai (Cash)
                </span>
                <p className="text-2xl font-black text-emerald-700">{formatRupiah(cashOmset)}</p>
                <p className="text-[11px] text-slate-400">Pembayaran tunai kasir</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  QRIS Statis / Transfer
                </span>
                <p className="text-2xl font-black text-sky-700">{formatRupiah(qrisOmset)}</p>
                <p className="text-[11px] text-slate-400">Scan QRIS kasir langsung</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-amber-600" /> Rata-Rata per Meja (AOV)
                </span>
                <p className="text-2xl font-black text-slate-900">
                  {paidCount > 0 ? formatRupiah(totalOmset / paidCount) : 'Rp 0'}
                </p>
                <p className="text-[11px] text-slate-400">Nilai rata-rata tagihan</p>
              </div>
            </div>

            {/* Peak Hours & Top Best Sellers Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Peak Hours Hourly Chart */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      <span>Grafik Jam Ramai Pesanan</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">Distribusi volume pesanan jam 08:00 - 22:00 WIB</p>
                  </div>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                    Puncak: {maxOrdersInAnHour} Order/Jam
                  </span>
                </div>

                <div className="h-44 flex items-end justify-between gap-1.5 pt-6 pb-2 px-1 border-b border-slate-100">
                  {Object.entries(hourlyOrders).map(([hour, count]) => {
                    const pct = Math.max(8, Math.round((count / maxOrdersInAnHour) * 100));
                    const isHigh = count > 0 && count === maxOrdersInAnHour;
                    return (
                      <div key={hour} className="flex-1 flex flex-col items-center gap-1.5 group relative">
                        {/* Tooltip on hover */}
                        <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[9px] font-bold py-0.5 px-1.5 rounded pointer-events-none whitespace-nowrap z-10">
                          {hour}:00 • {count} order
                        </div>
                        <div className="w-full flex items-end justify-center h-28">
                          <div
                            style={{ height: `${pct}%` }}
                            className={`w-full max-w-[18px] rounded-t-md transition-all duration-300 ${
                              isHigh
                                ? 'bg-emerald-500 shadow-xs'
                                : count > 0
                                ? 'bg-emerald-300 hover:bg-emerald-400'
                                : 'bg-slate-100 hover:bg-slate-200'
                            }`}
                          />
                        </div>
                        <span className={`text-[9px] font-mono ${isHigh ? 'font-bold text-emerald-700' : 'text-slate-400'}`}>
                          {hour}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Pagi (08:00)</span>
                  <span>Siang (12:00)</span>
                  <span>Malam (20:00+)</span>
                </div>
              </div>

              {/* Top 5 Best Sellers */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Top 5 Menu Terlaris</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">Menu paling banyak dipesan dan menyumbang omset</p>
                  </div>
                  <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
                    Favorit Pelanggan
                  </span>
                </div>

                {topBestSellers.length === 0 ? (
                  <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-xs">
                    <Utensils className="w-8 h-8 text-slate-200 mb-2" />
                    <span>Belum ada data pesanan lunas</span>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {topBestSellers.map((item, idx) => (
                      <div key={item.name} className="py-2.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center font-extrabold text-[11px] ${
                              idx === 0
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : idx === 1
                                ? 'bg-slate-200 text-slate-700'
                                : idx === 2
                                ? 'bg-amber-800/10 text-amber-900'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            #{idx + 1}
                          </span>
                          <div>
                            <p className="font-bold text-slate-900">{item.name}</p>
                            <p className="text-[10px] text-slate-400">{item.totalQty} porsi terjual</p>
                          </div>
                        </div>
                        <span className="font-extrabold text-slate-800 font-mono">
                          {formatRupiah(item.totalRevenue)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <h3 className="font-bold text-sm text-slate-800">Daftar Transaksi Pesanan Real-time</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] tracking-wider">
                      <th className="pb-3">No. Pesanan</th>
                      <th className="pb-3">Lokasi</th>
                      <th className="pb-3">Waktu</th>
                      <th className="pb-3">Items</th>
                      <th className="pb-3">Total Tagihan</th>
                      <th className="pb-3">Metode Bayar</th>
                      <th className="pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders.slice(0, 15).map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50">
                        <td className="py-3 font-extrabold text-slate-900">{o.orderNumber}</td>
                        <td className="py-3 text-slate-600">{o.table ? `Meja ${o.table.number}` : 'Pesan Langsung'}</td>
                        <td className="py-3 text-slate-500">
                          {new Date(o.createdAt).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 text-slate-600">{o.items?.length || 0} menu</td>
                        <td className="py-3 font-extrabold text-slate-900">{formatRupiah(o.totalAmount)}</td>
                        <td className="py-3 uppercase font-semibold text-slate-500">{o.paymentMethod}</td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              o.isPaid || o.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : o.status === 'pending'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-sky-100 text-sky-800'
                            }`}
                          >
                            {o.isPaid ? 'LUNAS' : o.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Menu Catalog with Full CRUD */}
        {activeTab === 'menu' && (
          <div className="space-y-6">
            <div className="bg-emerald-50 border border-emerald-200/80 p-4 rounded-2xl text-xs text-emerald-900 flex items-center justify-between">
              <div>
                <p className="font-bold text-sm">Saklar Menu Habis & Manajemen Katalog</p>
                <p className="text-emerald-700 mt-0.5">
                  Klik saklar untuk menandai menu <b>Habis / Tersedia</b>. Anda juga bisa menambah menu baru dan mengedit harga kapan saja.
                </p>
              </div>
            </div>

            {venue?.categories.map((category: any) => (
              <div key={category.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="font-black text-sm text-slate-900 uppercase tracking-wider">{category.name}</h3>
                  <span className="text-xs text-slate-400">{category.menuItems.length} menu terdaftar</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {category.menuItems.map((item: any) => (
                    <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-12 h-12 rounded-xl object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                            <Utensils className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-900 text-xs">{item.name}</p>
                          <p className="font-semibold text-slate-500 text-[11px]">{formatRupiah(item.price)}</p>
                          {item.description && <p className="text-[10px] text-slate-400 line-clamp-1">{item.description}</p>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Toggle Available Switch */}
                        <button
                          onClick={() => handleToggleAvailable(item.id, item.isAvailable)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                            item.isAvailable
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                          }`}
                        >
                          {item.isAvailable ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Tersedia</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>Habis</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleDeleteMenuItem(item.id, item.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Hapus Menu"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Tables & NFC Card Tokens */}
        {activeTab === 'tables' && (
          <div className="space-y-6">
            <div className="bg-sky-50 border border-sky-200/80 p-4 rounded-2xl text-xs text-sky-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="font-bold text-sm">Pengaturan Meja & Token Kartu NFC</p>
                <p className="text-sky-700 mt-0.5">
                  Setiap meja memiliki token NFC unik yang ter-lock permanen. Klik <b>"Cetak Lembar Kartu QR Meja"</b> untuk mencetak stiker atau akrilik meja.
                </p>
              </div>
              <Link
                href={`/admin/${venueSlug}/print-qr`}
                target="_blank"
                className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shrink-0"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>Cetak Semua Meja</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {tables.map((table) => {
                const targetUrl = typeof window !== 'undefined' ? `${window.location.origin}/c/${table.cardToken}` : '';

                return (
                  <div key={table.id} className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-black text-base text-slate-900">Meja {table.number}</span>
                          <p className="text-[11px] text-slate-400">{table.label || 'Area Meja'}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteTable(table.id, table.number)}
                          className="p-1 rounded text-slate-300 hover:text-rose-600 transition-colors"
                          title="Hapus Meja"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="mt-3 p-2 bg-slate-50 rounded-xl border border-slate-100 text-[10px] font-mono break-all text-slate-600">
                        {targetUrl}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <Link
                        href={`/c/${table.cardToken}`}
                        target="_blank"
                        className="w-full text-center bg-slate-900 hover:bg-black text-white text-xs font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-1"
                      >
                        <span>Tes Buka Menu</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab: Riwayat Aksi (Audit Log) */}
        {activeTab === 'audit' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Riwayat Aksi Krusial</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Catatan permanen void order, ubah harga, hapus menu, dan perubahan pengaturan. Tidak bisa diubah atau dihapus.
                </p>
              </div>
              <button
                onClick={loadAuditLogs}
                disabled={auditLoading}
                className="text-xs font-bold px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50"
              >
                {auditLoading ? 'Memuat...' : 'Muat Ulang'}
              </button>
            </div>

            {auditLoading && auditLogs.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-400">Memuat riwayat...</p>
            ) : auditLogs.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-400">Belum ada aksi tercatat.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <div key={log.id} className="px-6 py-3.5 flex items-start justify-between gap-4 hover:bg-slate-50/70">
                    <div className="min-w-0">
                      <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                        {log.action}
                      </span>
                      <p className="text-xs text-slate-500 mt-1.5 font-mono break-all">{log.details || '-'}</p>
                    </div>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('id-ID')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Hub analytics owner-only; kasir tidak melihat data ini. */}
        {activeTab === 'analytics' && (
          <div className="space-y-5 max-w-4xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Hub NFC & Masukan Tamu</h2>
                <p className="text-xs text-slate-500 mt-0.5">7 hari terakhir. Deteksi kartu rusak adalah indikasi, bukan kepastian.</p>
              </div>
              <button onClick={loadHubAnalytics} disabled={analyticsLoading} className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 disabled:opacity-50">
                {analyticsLoading ? 'Memuat...' : 'Muat Ulang'}
              </button>
            </div>
            {tapAnalytics && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Metric label="Total tap" value={tapAnalytics.totalTaps} />
                  <Metric label="Rata-rata tap / meja aktif" value={tapAnalytics.avgTapsPerActiveTable} />
                  <Metric label="Kartu perlu dicek" value={tapAnalytics.brokenCardAlerts.length} danger={tapAnalytics.brokenCardAlerts.length > 0} />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-slate-900 mb-3">Aktivitas per Meja</h3>
                  <div className="space-y-2">
                    {tapAnalytics.tables.map((t: any) => (
                      <div key={t.tableId} className="flex items-center justify-between text-xs py-2 border-b border-slate-100 last:border-0">
                        <span className="font-bold text-slate-800">Meja {t.number} {t.label ? `· ${t.label}` : ''}</span>
                        <span className={t.suspectedBroken ? 'font-bold text-rose-600' : 'text-slate-600'}>{t.suspectedBroken ? 'Cek kartu NFC' : `${t.taps} tap`}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Kritik & Saran Anonim</h3>
              {feedbacks.length === 0 ? <p className="text-xs text-slate-500">Belum ada masukan.</p> : <div className="space-y-3">{feedbacks.map((f) => <div key={f.id} className="border-b border-slate-100 last:border-0 pb-3 last:pb-0"><div className="flex justify-between text-xs"><span className="font-bold text-amber-600">{f.rating ? `${f.rating}/5` : 'Tanpa rating'}</span><span className="text-slate-400">{new Date(f.createdAt).toLocaleString('id-ID')}</span></div><p className="text-sm text-slate-700 mt-1">{f.message}</p></div>)}</div>}
            </div>
          </div>
        )}

        {/* Tab 4: Outlet & PIN Settings */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl bg-white rounded-3xl border border-slate-200 p-7 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Pengaturan Outlet & Keamanan</h2>
              <p className="text-xs text-slate-500 mt-0.5">Atur profil resto, kontak WhatsApp, dan PIN login cepat layar kasir.</p>
            </div>

            <form onSubmit={handleUpdateSettings} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Outlet / Resto</label>
                <input
                  type="text"
                  required
                  value={settingsName}
                  onChange={(e) => setSettingsName(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  Nomor WhatsApp Notifikasi
                </label>
                <input
                  type="text"
                  placeholder="08123456789"
                  value={settingsWhatsapp}
                  onChange={(e) => setSettingsWhatsapp(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none font-mono text-slate-800"
                />
                <p className="text-[11px] text-slate-400 mt-1">Nomor pemilik resto untuk menerima rekap laporan omset harian.</p>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-600" />
                  Alamat Lengkap Outlet
                </label>
                <textarea
                  rows={2}
                  placeholder="Jl. Senopati No. 12, Kebayoran Baru, Jakarta Selatan"
                  value={settingsAddress}
                  onChange={(e) => setSettingsAddress(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none font-medium text-slate-800"
                />
                <p className="text-[11px] text-slate-400 mt-1">Alamat ini akan dicetak otomatis di header struk kasir thermal.</p>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  PIN Layar Kasir (4 Angka)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="1234"
                  value={settingsPin}
                  onChange={(e) => setSettingsPin(e.target.value)}
                  className="w-36 p-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none font-mono text-center text-lg font-black tracking-widest text-slate-800"
                />
                <p className="text-[11px] text-slate-400 mt-1">PIN cepat untuk kasir masuk tanpa harus mengetahui password akun pemilik.</p>
              </div>

              {/* Store Operational Status */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <label className="font-bold text-slate-700 block">Status Operasional Toko / Dapur</label>
                  <p className="text-[11px] text-slate-400">
                    {settingsIsOpen
                      ? 'Outlet sedang BUKA. Pelanggan di meja dapat membuat pesanan.'
                      : 'Outlet sedang TUTUP. Halaman menu terkunci & pesanan baru ditolak.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSettingsIsOpen(!settingsIsOpen)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    settingsIsOpen
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}
                >
                  {settingsIsOpen ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>BUKA (Menerima Order)</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-rose-600" />
                      <span>TUTUP (Dapur Libur)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Tax & Service Rate */}
              <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Pajak Restoran PB1 (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={settingsTaxRate}
                      onChange={(e) => setSettingsTaxRate(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none font-mono text-slate-800"
                    />
                    <span className="absolute right-3.5 top-3.5 text-xs font-bold text-slate-400">%</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Standar PB1 daerah adalah 10% (0 untuk nonaktifkan).</p>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Biaya Layanan / Service Charge (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={settingsServiceRate}
                      onChange={(e) => setSettingsServiceRate(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none font-mono text-slate-800"
                    />
                    <span className="absolute right-3.5 top-3.5 text-xs font-bold text-slate-400">%</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Biaya operasional/service cafe (biasanya 5%).</p>
                </div>
              </div>

              {/* QRIS Image URL */}
              <div className="pt-3 border-t border-slate-100">
                <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-sky-600" />
                  URL Gambar QRIS Meja (Self-Service)
                </label>
                <input
                  type="text"
                  placeholder="/qris-outlet.png atau https://.../qris.jpg"
                  value={settingsQrisUrl}
                  onChange={(e) => setSettingsQrisUrl(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none font-mono text-xs text-slate-800"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Gambar QRIS ini akan ditampilkan saat pelanggan memilih opsi "Bayar QRIS di Meja".
                </p>
                {settingsQrisUrl && (
                  <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded-xl inline-block">
                    <img src={settingsQrisUrl} alt="Preview QRIS" className="w-24 h-24 object-contain rounded-lg" />
                  </div>
                )}
              </div>

              {/* Table hub — halaman yang dibuka setelah tap NFC/QR. */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div>
                  <h3 className="font-extrabold text-slate-900">Hub Kartu NFC</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Pesan, WiFi, ulasan Google, kritik anonim, dan promo katalog.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Nama WiFi (SSID)</label>
                    <input value={settingsWifiSsid} onChange={(e) => setSettingsWifiSsid(e.target.value)} maxLength={64} placeholder="Contoh: Cafe-Guest" className="w-full p-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none text-slate-800" />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Password WiFi</label>
                    <input value={settingsWifiPassword} onChange={(e) => setSettingsWifiPassword(e.target.value)} maxLength={64} placeholder="Tampil dengan tombol salin" className="w-full p-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none text-slate-800" />
                  </div>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Link Ulasan Google Maps</label>
                  <input type="url" value={settingsGmapsReviewUrl} onChange={(e) => setSettingsGmapsReviewUrl(e.target.value)} placeholder="https://g.page/r/.../review" className="w-full p-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none text-slate-800" />
                  <p className="text-[11px] text-slate-400 mt-1">Ditampilkan netral ke semua tamu. Tidak ada review gating.</p>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Link Instagram</label>
                  <input type="url" value={settingsInstagramUrl} onChange={(e) => setSettingsInstagramUrl(e.target.value)} placeholder="https://instagram.com/namarestomu" className="w-full p-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none text-slate-800" />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Promo Hari Ini</label>
                  <input value={settingsAnnouncement} onChange={(e) => setSettingsAnnouncement(e.target.value)} maxLength={200} placeholder="Contoh: Beli 2 kopi, diskon 20%" className="w-full p-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none text-slate-800" />
                  <p className="text-[11px] text-slate-400 mt-1">Muncul di atas katalog saat tamu siap memilih menu.</p>
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  {isSavingSettings ? 'Menyimpan...' : 'Simpan Pengaturan Outlet'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Modal: Add Menu Item */}
      {isAddMenuModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-slate-900 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-base">Tambah Menu Baru</h3>
              <button onClick={() => setIsAddMenuModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMenuItem} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Kategori Menu</label>
                <select
                  value={newMenuCategoryId}
                  onChange={(e) => setNewMenuCategoryId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium"
                >
                  {venue?.categories.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Menu</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Es Kopi Gula Aren"
                  value={newMenuName}
                  onChange={(e) => setNewMenuName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Harga (Rupiah)</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="500"
                  placeholder="25000"
                  value={newMenuPrice}
                  onChange={(e) => setNewMenuPrice(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Deskripsi Singkat</label>
                <textarea
                  rows={2}
                  placeholder="Racikan kopi arabika dengan gula aren murni..."
                  value={newMenuDesc}
                  onChange={(e) => setNewMenuDesc(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">URL Foto Menu (Opsional)</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={newMenuImage}
                  onChange={(e) => setNewMenuImage(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingItem}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-md transition-all"
                >
                  {isSubmittingItem ? 'Menyimpan...' : 'Simpan Menu Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Category */}
      {isAddCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-slate-900 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-base">Tambah Kategori</h3>
              <button onClick={() => setIsAddCategoryModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Kategori</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Camilan / Dessert"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingCat}
                  className="w-full bg-slate-900 hover:bg-black text-white font-bold py-3 rounded-xl shadow-md transition-all"
                >
                  {isSubmittingCat ? 'Menyimpan...' : 'Simpan Kategori'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Table */}
      {isAddTableModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-slate-900 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-base">Tambah Meja Baru</h3>
              <button onClick={() => setIsAddTableModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTable} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nomor / Nama Meja</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: 11 atau VIP 3"
                  value={newTableNumber}
                  onChange={(e) => setNewTableNumber(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Label / Area</label>
                <input
                  type="text"
                  placeholder="Misal: Lantai 2, Outdoor, Bar"
                  value={newTableLabel}
                  onChange={(e) => setNewTableLabel(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingTable}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-md transition-all"
                >
                  {isSubmittingTable ? 'Menyimpan...' : 'Simpan & Buat Token NFC'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
