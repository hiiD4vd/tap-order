'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import {
  Utensils,
  Search,
  Plus,
  Minus,
  ShoppingBag,
  Bell,
  Receipt,
  X,
  Check,
  CheckCircle2,
  Clock,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  QrCode,
  ChefHat,
} from 'lucide-react';
import { formatRupiah } from '@/lib/utils';

type OptionChoice = {
  id: string;
  name: string;
  priceDelta: number;
};

type OptionGroup = {
  id: string;
  name: string;
  type: string;
  required: boolean;
  choices: OptionChoice[];
};

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  isPopular: boolean;
  optionGroups: OptionGroup[];
};

type Category = {
  id: string;
  name: string;
  menuItems: MenuItem[];
};

type Venue = {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  logoUrl: string | null;
  taxRate?: number;
  serviceRate?: number;
  qrisImageUrl?: string | null;
  isOpen?: boolean;
  categories: Category[];
};

type CartItem = {
  cartItemId: string;
  menuItemId: string;
  name: string;
  basePrice: number;
  unitPrice: number;
  quantity: number;
  notes: string;
  selectedOptions: {
    group: string;
    choice: string;
    priceDelta: number;
  }[];
};

export default function CustomerMenuPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const venueSlug = params.venueSlug as string;
  const tableIdFromQuery = searchParams.get('tableId') || '';
  const tableNumberFromQuery = searchParams.get('tableNumber') || '';
  const tokenFromQuery = searchParams.get('token') || '';

  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [tableNumber, setTableNumber] = useState(tableNumberFromQuery);
  const [tableId, setTableId] = useState(tableIdFromQuery);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedItemForModal, setSelectedItemForModal] = useState<MenuItem | null>(null);

  const [modalSelections, setModalSelections] = useState<Record<string, string[]>>({});
  const [modalNotes, setModalNotes] = useState('');
  const [modalQty, setModalQty] = useState(1);

  const [customerName, setCustomerName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<any | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active Order Tracking & QRIS Modal
  const [activeOrder, setActiveOrder] = useState<any | null>(null);
  const [isOrderTrackingOpen, setIsOrderTrackingOpen] = useState(false);
  const [isQrisModalOpen, setIsQrisModalOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchActiveTableOrder = async (targetTableId?: string) => {
    const tid = targetTableId || tableId;
    if (!venueSlug || !tid) return;
    try {
      const res = await fetch(`/api/orders?venueSlug=${venueSlug}&tableId=${tid}&status=pending,preparing,served`);
      const data = await res.json();
      if (data.success && data.orders && data.orders.length > 0) {
        setActiveOrder(data.orders[0]);
      } else {
        setActiveOrder(null);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!venueSlug) return;
    fetch(`/api/menu/${venueSlug}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.venue) {
          setVenue(data.venue);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load menu:', err);
        setLoading(false);
      });
  }, [venueSlug]);

  useEffect(() => {
    let currentTid = '';
    if (tableNumberFromQuery) {
      setTableNumber(tableNumberFromQuery);
      setTableId(tableIdFromQuery);
      currentTid = tableIdFromQuery;
      sessionStorage.setItem('tap_tableNumber', tableNumberFromQuery);
      sessionStorage.setItem('tap_tableId', tableIdFromQuery);
    } else {
      const savedNum = sessionStorage.getItem('tap_tableNumber');
      const savedId = sessionStorage.getItem('tap_tableId');
      if (savedNum) setTableNumber(savedNum);
      if (savedId) {
        setTableId(savedId);
        currentTid = savedId;
      }
    }

    if (currentTid) {
      fetchActiveTableOrder(currentTid);
    }
  }, [tableNumberFromQuery, tableIdFromQuery]);

  useEffect(() => {
    if (!tableId) return;
    const interval = setInterval(() => fetchActiveTableOrder(tableId), 6000);
    return () => clearInterval(interval);
  }, [venueSlug, tableId]);

  const handleOpenItemModal = (item: MenuItem) => {
    if (!item.isAvailable) return;
    setSelectedItemForModal(item);
    setModalQty(1);
    setModalNotes('');

    const initialChoices: Record<string, string[]> = {};
    item.optionGroups.forEach((group) => {
      if (group.type === 'single' && group.choices.length > 0) {
        initialChoices[group.id] = [group.choices[0].id];
      } else {
        initialChoices[group.id] = [];
      }
    });
    setModalSelections(initialChoices);
  };

  const modalItemTotal = useMemo(() => {
    if (!selectedItemForModal) return 0;
    let unit = selectedItemForModal.price;

    selectedItemForModal.optionGroups.forEach((group) => {
      const selectedIds = modalSelections[group.id] || [];
      group.choices.forEach((choice) => {
        if (selectedIds.includes(choice.id)) {
          unit += choice.priceDelta;
        }
      });
    });

    return unit * modalQty;
  }, [selectedItemForModal, modalSelections, modalQty]);

  const handleAddToCart = () => {
    if (!selectedItemForModal) return;

    for (const group of selectedItemForModal.optionGroups) {
      const selected = modalSelections[group.id] || [];
      if (group.required && selected.length === 0) {
        alert(`Harap pilih salah satu opsi untuk "${group.name}"`);
        return;
      }
    }

    const selectedOptionsList: { group: string; choice: string; priceDelta: number }[] = [];
    let calculatedUnit = selectedItemForModal.price;

    selectedItemForModal.optionGroups.forEach((group) => {
      const selectedIds = modalSelections[group.id] || [];
      group.choices.forEach((choice) => {
        if (selectedIds.includes(choice.id)) {
          calculatedUnit += choice.priceDelta;
          selectedOptionsList.push({
            group: group.name,
            choice: choice.name,
            priceDelta: choice.priceDelta,
          });
        }
      });
    });

    const newCartItem: CartItem = {
      cartItemId: Math.random().toString(36).substring(2, 9),
      menuItemId: selectedItemForModal.id,
      name: selectedItemForModal.name,
      basePrice: selectedItemForModal.price,
      unitPrice: calculatedUnit,
      quantity: modalQty,
      notes: modalNotes.trim(),
      selectedOptions: selectedOptionsList,
    };

    setCart((prev) => [...prev, newCartItem]);
    setSelectedItemForModal(null);
    showToast(`✓ Ditambahkan: ${selectedItemForModal.name}`);
  };

  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, it) => acc + it.unitPrice * it.quantity, 0);
  }, [cart]);

  const cartTaxAmount = useMemo(() => {
    return Math.round((cartSubtotal * (venue?.taxRate || 0)) / 100);
  }, [cartSubtotal, venue?.taxRate]);

  const cartServiceAmount = useMemo(() => {
    return Math.round((cartSubtotal * (venue?.serviceRate || 0)) / 100);
  }, [cartSubtotal, venue?.serviceRate]);

  const cartTotalAmount = useMemo(() => {
    return cartSubtotal + cartTaxAmount + cartServiceAmount;
  }, [cartSubtotal, cartTaxAmount, cartServiceAmount]);

  const cartTotalQty = useMemo(() => {
    return cart.reduce((acc, it) => acc + it.quantity, 0);
  }, [cart]);

  const handleTableRequest = async (type: 'waiter' | 'bill') => {
    if (!venue || !tableId) {
      alert('Nomor meja tidak terdeteksi. Silakan scan ulang kartu meja Anda.');
      return;
    }

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venueId: venue.id,
          tableId,
          type,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(type === 'bill' ? ' Nota tagihan diminta ke kasir' : ' Pelayan segera menuju ke meja Anda');
      } else {
        alert(data.error || 'Gagal mengirim permintaan');
      }
    } catch {
      alert('Terjadi kesalahan jaringan');
    }
  };

  const handleSubmitOrder = async () => {
    if (cart.length === 0 || !venue) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venueId: venue.id,
          tableId: tableId || null,
          customerName: customerName.trim() || (tableNumber ? `Meja ${tableNumber}` : 'Tamu'),
          items: cart.map((c) => ({
            menuItemId: c.menuItemId,
            quantity: c.quantity,
            notes: c.notes,
            selectedOptions: c.selectedOptions,
          })),
        }),
      });

      const data = await res.json();
      if (data.success && data.order) {
        setSubmittedOrder(data.order);
        setCart([]);
        setIsCartOpen(false);
      } else {
        alert(data.error || 'Gagal mengirim pesanan');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat menghubungkan ke kasir');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCategories = useMemo(() => {
    if (!venue) return [];
    return venue.categories.map((cat) => {
      const filteredItems = cat.menuItems.filter((item) => {
        const matchesCat = activeCategory === 'all' || activeCategory === cat.id;
        const matchesSearch =
          searchQuery === '' ||
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesCat && matchesSearch;
      });
      return {
        ...cat,
        menuItems: filteredItems,
      };
    }).filter((cat) => cat.menuItems.length > 0);
  }, [venue, activeCategory, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-600 text-sm font-medium">Memuat menu digital...</p>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-sm">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-800">Outlet Tidak Ditemukan</h2>
          <p className="text-slate-500 text-sm mt-1">Pastikan link kartu meja yang Anda scan sudah benar.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28 bg-slate-50 text-slate-800">
      {toastMessage && (
        <div className="fixed top-4 inset-x-4 z-50 flex justify-center pointer-events-none animate-bounce">
          <div className="bg-slate-900 text-white px-5 py-2.5 rounded-full text-sm font-semibold shadow-2xl flex items-center gap-2">
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Store Closed Warning Banner */}
      {venue.isOpen === false && (
        <div className="bg-rose-600 text-white px-4 py-2.5 text-center text-xs font-bold sticky top-0 z-40 shadow-md flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Dapur saat ini sedang TUTUP. Anda tetap dapat melihat menu, namun pemesanan ditutup sementara.</span>
        </div>
      )}

      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 shadow-xs">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
              {venue.name.charAt(0)}
            </div>
            <div>
              <h1 className="font-bold text-base text-slate-900 leading-tight line-clamp-1">{venue.name}</h1>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                {tableNumber ? (
                  <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/70">
                    Meja {tableNumber}
                  </span>
                ) : (
                  <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">Pesan Langsung</span>
                )}
                <span>• Pesan Mandiri</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleTableRequest('waiter')}
              title="Panggil Pelayan"
              className="p-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 active:scale-95 rounded-xl border border-slate-200 transition-all flex items-center gap-1 text-xs font-medium"
            >
              <Bell className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Pelayan</span>
            </button>
            <button
              onClick={() => handleTableRequest('bill')}
              title="Minta Tagihan / Bill"
              className="p-2 text-slate-600 hover:text-amber-700 hover:bg-amber-50 active:scale-95 rounded-xl border border-slate-200 transition-all flex items-center gap-1 text-xs font-medium"
            >
              <Receipt className="w-4 h-4 text-amber-600" />
              <span className="hidden sm:inline">Bill</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="max-w-md mx-auto mt-2.5 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari makanan, kopi, camilan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-100 hover:bg-slate-100/80 focus:bg-white text-slate-800 text-sm rounded-xl pl-9 pr-4 py-2 border border-transparent focus:border-emerald-500 focus:outline-none transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Category Pills */}
        <div className="max-w-md mx-auto mt-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activeCategory === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Menu
          </button>
          {venue.categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </header>

      {/* Main Menu Feed */}
      <main className="max-w-md mx-auto px-4 mt-4 space-y-6">
        {filteredCategories.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
            <Utensils className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-600 font-medium text-sm">Tidak ada menu yang cocok</p>
            <p className="text-slate-400 text-xs mt-1">Coba gunakan kata kunci pencarian yang lain.</p>
          </div>
        ) : (
          filteredCategories.map((category) => (
            <section key={category.id} className="space-y-3">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <span>{category.name}</span>
                <span className="text-xs font-normal text-slate-400 lowercase">({category.menuItems.length} menu)</span>
              </h2>

              <div className="grid gap-3">
                {category.menuItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => item.isAvailable && handleOpenItemModal(item)}
                    className={`bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs flex items-center justify-between gap-3.5 transition-all ${
                      item.isAvailable
                        ? 'cursor-pointer hover:border-emerald-300 active:scale-[0.99]'
                        : 'opacity-55 cursor-not-allowed bg-slate-100/60'
                    }`}
                  >
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-1">{item.name}</h3>
                        {item.isPopular && item.isAvailable && (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <Sparkles className="w-2.5 h-2.5" /> Best
                          </span>
                        )}
                        {!item.isAvailable && (
                          <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                            Habis
                          </span>
                        )}
                      </div>

                      {item.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-2.5">
                        <span className="font-extrabold text-slate-900 text-sm">
                          {formatRupiah(item.price)}
                        </span>
                        {item.optionGroups.length > 0 && (
                          <span className="text-[11px] text-emerald-700 font-medium">Bisa kustom opsi +</span>
                        )}
                      </div>
                    </div>

                    <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <Utensils className="w-6 h-6" />
                        </div>
                      )}
                      {item.isAvailable && (
                        <button
                          type="button"
                          className="absolute bottom-1 right-1 w-6 h-6 bg-emerald-600 text-white rounded-lg flex items-center justify-center shadow-md hover:bg-emerald-700 active:scale-90 transition-all"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      {/* Floating Bottom Cart Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 inset-x-4 z-40 max-w-md mx-auto">
          <div
            onClick={() => setIsCartOpen(true)}
            className="bg-slate-900 text-white rounded-2xl p-3.5 shadow-2xl flex items-center justify-between cursor-pointer hover:bg-black transition-all active:scale-[0.99] border border-slate-700/50"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-sm shadow-sm">
                {cartTotalQty}
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Total Pesanan Meja</p>
                <p className="text-base font-extrabold text-white">{formatRupiah(cartTotalAmount)}</p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-emerald-400 font-bold text-sm pr-1">
              <span>Lihat Keranjang</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      )}

      {/* Item Customization & Modifier Modal */}
      {selectedItemForModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
            <div className="relative p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">{selectedItemForModal.name}</h3>
                <p className="text-xs text-emerald-700 font-extrabold mt-0.5">
                  Mulai {formatRupiah(selectedItemForModal.price)}
                </p>
              </div>
              <button
                onClick={() => setSelectedItemForModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-5 flex-1">
              {selectedItemForModal.imageUrl && (
                <div className="h-44 w-full rounded-2xl overflow-hidden bg-slate-100">
                  <img
                    src={selectedItemForModal.imageUrl}
                    alt={selectedItemForModal.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {selectedItemForModal.description && (
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {selectedItemForModal.description}
                </p>
              )}

              {selectedItemForModal.optionGroups.map((group) => {
                const currentSelected = modalSelections[group.id] || [];

                return (
                  <div key={group.id} className="space-y-2 border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-800">{group.name}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-500">
                        {group.required ? 'Wajib' : 'Opsional'}
                      </span>
                    </div>

                    <div className="grid gap-2">
                      {group.choices.map((choice) => {
                        const isChecked = currentSelected.includes(choice.id);

                        return (
                          <button
                            key={choice.id}
                            type="button"
                            onClick={() => {
                              if (group.type === 'single') {
                                setModalSelections((prev) => ({
                                  ...prev,
                                  [group.id]: [choice.id],
                                }));
                              } else {
                                setModalSelections((prev) => {
                                  const exists = currentSelected.includes(choice.id);
                                  const updated = exists
                                    ? currentSelected.filter((id) => id !== choice.id)
                                    : [...currentSelected, choice.id];
                                  return { ...prev, [group.id]: updated };
                                });
                              }
                            }}
                            className={`p-3 rounded-xl border text-left flex items-center justify-between text-xs transition-all ${
                              isChecked
                                ? 'border-emerald-600 bg-emerald-50/70 font-semibold text-emerald-900'
                                : 'border-slate-200 hover:border-slate-300 text-slate-700'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span
                                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                  isChecked ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'
                                }`}
                              >
                                {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </span>
                              {choice.name}
                            </span>
                            <span className="font-semibold text-slate-600">
                              {choice.priceDelta > 0 ? `+${formatRupiah(choice.priceDelta)}` : 'Termasuk'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <div className="space-y-1.5 border-t border-slate-100 pt-3">
                <label className="text-xs font-bold text-slate-700">Catatan Khusus (Opsional)</label>
                <input
                  type="text"
                  placeholder="Contoh: jangan pakai seledri, kuah dipisah, es sedikit..."
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:border-emerald-500 focus:outline-none placeholder:text-slate-400"
                />
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-xs font-bold text-slate-700">Jumlah Pesanan</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setModalQty((q) => Math.max(1, q - 1))}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 active:scale-95"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-extrabold text-sm text-slate-900 min-w-4 text-center">{modalQty}</span>
                  <button
                    onClick={() => setModalQty((q) => q + 1)}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button
                onClick={handleAddToCart}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl text-sm shadow-md transition-all active:scale-[0.99] flex items-center justify-between"
              >
                <span>Tambah ke Pesanan</span>
                <span>{formatRupiah(modalItemTotal)}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cart & Checkout Sheet */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Pesanan {tableNumber ? `Meja ${tableNumber}` : ''}</h3>
                <p className="text-xs text-slate-500">{cart.length} jenis menu dipilih</p>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {cart.map((item) => (
                <div key={item.cartItemId} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{item.name}</p>
                      {item.selectedOptions.length > 0 && (
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {item.selectedOptions.map((o) => `${o.group}: ${o.choice}`).join(' • ')}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-[11px] text-amber-700 italic mt-0.5 font-medium">"{item.notes}"</p>
                      )}
                    </div>
                    <span className="font-bold text-slate-900">{formatRupiah(item.unitPrice * item.quantity)}</span>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-200/60">
                    <span className="text-[11px] text-slate-500">Harga per porsi: {formatRupiah(item.unitPrice)}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setCart((prev) =>
                            prev
                              .map((c) => (c.cartItemId === item.cartItemId ? { ...c, quantity: c.quantity - 1 } : c))
                              .filter((c) => c.quantity > 0)
                          );
                        }}
                        className="w-6 h-6 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-600"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-bold text-xs min-w-4 text-center">{item.quantity}</span>
                      <button
                        onClick={() => {
                          setCart((prev) =>
                            prev.map((c) => (c.cartItemId === item.cartItemId ? { ...c, quantity: c.quantity + 1 } : c))
                          );
                        }}
                        className="w-6 h-6 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-600"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <div className="pt-2">
                <label className="text-xs font-bold text-slate-700 block mb-1">Nama Pemesan (Opsional)</label>
                <input
                  type="text"
                  placeholder="Misal: Budi / Rian"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="bg-emerald-50 border border-emerald-200/70 p-3 rounded-xl text-xs text-emerald-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Bayar Nanti di Kasir
                </p>
                <p className="text-[11px] text-emerald-700 leading-relaxed">
                  Pesanan langsung diproses dapur. Pembayaran dapat dilakukan tunai atau QRIS saat selesai makan di kasir.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 space-y-3">
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal Menu</span>
                  <span className="font-semibold text-slate-800">{formatRupiah(cartSubtotal)}</span>
                </div>
                {cartTaxAmount > 0 && (
                  <div className="flex justify-between">
                    <span>PB1 Restoran ({venue?.taxRate}%):</span>
                    <span className="font-semibold text-slate-800">{formatRupiah(cartTaxAmount)}</span>
                  </div>
                )}
                {cartServiceAmount > 0 && (
                  <div className="flex justify-between">
                    <span>Biaya Layanan ({venue?.serviceRate}%):</span>
                    <span className="font-semibold text-slate-800">{formatRupiah(cartServiceAmount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-200">
                  <span className="font-bold text-slate-800">Total Tagihan</span>
                  <span className="text-lg font-extrabold text-emerald-700">{formatRupiah(cartTotalAmount)}</span>
                </div>
              </div>

              <button
                disabled={isSubmitting || cart.length === 0 || venue?.isOpen === false}
                onClick={handleSubmitOrder}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3.5 px-4 rounded-xl text-sm shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2"
              >
                {venue?.isOpen === false ? (
                  <span>Dapur Sedang Tutup</span>
                ) : isSubmitting ? (
                  <span>Mengirim ke Kasir...</span>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    <span>Kirim Pesanan ke Kasir</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Active Order Status Pill */}
      {activeOrder && (
        <div className="fixed bottom-20 inset-x-4 z-40 max-w-md mx-auto">
          <button
            onClick={() => setIsOrderTrackingOpen(true)}
            className="w-full bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center justify-between gap-3 animate-in slide-in-from-bottom duration-200 active:scale-[0.99]"
          >
            <div className="flex items-center gap-3 text-left">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0">
                {activeOrder.status === 'pending' && <Clock className="w-5 h-5 animate-pulse" />}
                {activeOrder.status === 'preparing' && <ChefHat className="w-5 h-5 animate-bounce" />}
                {activeOrder.status === 'served' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xs text-white">{activeOrder.orderNumber}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      activeOrder.status === 'pending'
                        ? 'bg-amber-500/20 text-amber-300'
                        : activeOrder.status === 'preparing'
                        ? 'bg-sky-500/20 text-sky-300'
                        : 'bg-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    {activeOrder.status === 'pending'
                      ? 'Diterima Kasir'
                      : activeOrder.status === 'preparing'
                      ? 'Sedang Dimasak 👨‍🍳'
                      : 'Siap Disajikan 🍽️'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {activeOrder.items?.length || 0} Menu • {formatRupiah(activeOrder.totalAmount)}
                </p>
              </div>
            </div>

            <span className="text-xs font-bold text-emerald-400 flex items-center gap-0.5 shrink-0">
              <span>Status</span>
              <ChevronRight className="w-4 h-4" />
            </span>
          </button>
        </div>
      )}

      {/* Live Order Tracking Modal */}
      {isOrderTrackingOpen && activeOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-800 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Status Pesanan {activeOrder.orderNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  {tableNumber ? `Meja ${tableNumber}` : 'Pesan Langsung'} • {new Date(activeOrder.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button
                onClick={() => setIsOrderTrackingOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
              {/* Timeline */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Pesanan Diterima</p>
                    <p className="text-[11px] text-slate-500">Kasir telah memvalidasi pesanan Anda</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                      ['preparing', 'served', 'completed'].includes(activeOrder.status)
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    <ChefHat className="w-4 h-4" />
                  </div>
                  <div>
                    <p
                      className={`font-bold ${
                        activeOrder.status === 'preparing' ? 'text-sky-700' : 'text-slate-900'
                      }`}
                    >
                      Sedang Dimasak
                    </p>
                    <p className="text-[11px] text-slate-500">Koki di dapur sedang meracik hidangan</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                      ['served', 'completed'].includes(activeOrder.status)
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p
                      className={`font-bold ${
                        activeOrder.status === 'served' ? 'text-emerald-700' : 'text-slate-900'
                      }`}
                    >
                      Siap Disajikan
                    </p>
                    <p className="text-[11px] text-slate-500">Makanan siap diantar ke meja Anda</p>
                  </div>
                </div>
              </div>

              {/* Items Summary */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-700">Rincian Menu ({activeOrder.items?.length || 0})</h4>
                <div className="divide-y divide-slate-100 bg-white border border-slate-200/80 rounded-2xl p-3">
                  {activeOrder.items?.map((it: any) => (
                    <div key={it.id} className="py-2 flex justify-between items-start first:pt-0 last:pb-0">
                      <div>
                        <span className="font-bold text-slate-900">
                          {it.quantity}x {it.nameSnapshot}
                        </span>
                        {it.notes && <p className="text-[11px] text-amber-600 italic">"{it.notes}"</p>}
                      </div>
                      <span className="font-bold text-slate-700">
                        {formatRupiah(it.priceSnapshot * it.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-900">
                    {formatRupiah(activeOrder.subtotal || activeOrder.totalAmount)}
                  </span>
                </div>
                {activeOrder.taxAmount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>PB1 Restoran:</span>
                    <span className="font-semibold text-slate-900">{formatRupiah(activeOrder.taxAmount)}</span>
                  </div>
                )}
                {activeOrder.serviceAmount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Service Charge:</span>
                    <span className="font-semibold text-slate-900">{formatRupiah(activeOrder.serviceAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-900 font-extrabold text-sm pt-2 border-t border-slate-200">
                  <span>Total Tagihan:</span>
                  <span className="text-emerald-700">{formatRupiah(activeOrder.totalAmount)}</span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setIsOrderTrackingOpen(false);
                  setIsQrisModalOpen(true);
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95"
              >
                <QrCode className="w-4 h-4" />
                <span>Bayar QRIS di Meja</span>
              </button>

              <button
                onClick={() => handleTableRequest('bill')}
                className="w-full bg-slate-900 hover:bg-black text-white font-bold py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Receipt className="w-4 h-4" />
                <span>Minta Bill Kasir</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QRIS Direct Table Payment Modal */}
      {isQrisModalOpen && activeOrder && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-black uppercase text-slate-500 tracking-wider">Pembayaran Digital</span>
              <button onClick={() => setIsQrisModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="text-lg font-black text-slate-900">Scan QRIS di Meja</h3>
            <p className="text-xs text-slate-500 mt-1">
              Gunakan BCA Mobile, GoPay, OVO, Dana, atau ShopeePay
            </p>

            <div className="bg-slate-50 border-2 border-dashed border-emerald-500/50 rounded-2xl p-4 my-4 flex flex-col items-center">
              {venue?.qrisImageUrl ? (
                <img
                  src={venue.qrisImageUrl}
                  alt="QRIS Merchant"
                  className="w-48 h-48 object-contain rounded-xl"
                />
              ) : (
                <div className="w-44 h-44 bg-white border border-slate-200 rounded-xl p-3 flex flex-col items-center justify-center shadow-sm">
                  <QrCode className="w-28 h-28 text-slate-900" />
                  <span className="text-[10px] font-black text-slate-600 mt-1 tracking-widest uppercase">
                    QRIS RESMI
                  </span>
                </div>
              )}

              <div className="mt-3 text-center">
                <p className="text-[11px] text-slate-500">Nominal Transfer Tepat:</p>
                <p className="text-xl font-black text-emerald-700">{formatRupiah(activeOrder.totalAmount)}</p>
              </div>
            </div>

            <button
              onClick={() => {
                handleTableRequest('bill');
                setIsQrisModalOpen(false);
                showToast('✓ Konfirmasi pembayaran dikirim ke kasir!');
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl text-xs transition-all shadow-md active:scale-95"
            >
              Saya Sudah Transfer via QRIS
            </button>
          </div>
        </div>
      )}

      {/* Success Order Confirmation Screen */}
      {submittedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
              Pesanan Terkirim!
            </span>

            <h2 className="text-2xl font-black text-slate-900 mt-2">{submittedOrder.orderNumber}</h2>
            <p className="text-xs text-slate-500 mt-1">
              Pesanan Anda telah diterima kasir dan langsung diteruskan ke dapur.
            </p>

            <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 my-5 text-left text-xs space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Lokasi Meja:</span>
                <span className="font-bold text-slate-900">{tableNumber ? `Meja ${tableNumber}` : 'Pesan Langsung'}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Tagihan:</span>
                <span className="font-extrabold text-emerald-700">{formatRupiah(submittedOrder.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Metode Bayar:</span>
                <span className="font-medium text-slate-800">Bayar di Kasir (Tunai / QRIS)</span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => setSubmittedOrder(null)}
                className="w-full bg-slate-900 hover:bg-black text-white font-bold py-3 rounded-xl text-xs transition-all"
              >
                Pesan Menu Lainnya +
              </button>
              <button
                onClick={() => handleTableRequest('waiter')}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl text-xs transition-all"
              >
                Panggil Pelayan ke Meja
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
