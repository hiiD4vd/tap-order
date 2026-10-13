import Link from 'next/link';
import {
  Smartphone,
  Flame,
  LayoutDashboard,
  QrCode,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Zap,
  Coffee,
  Check,
  Clock,
  Printer,
  ChevronRight,
  HelpCircle,
  MessageCircle,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Background Gradient Effect */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/10 blur-[140px] rounded-full" />
        <div className="absolute top-[600px] right-0 w-[500px] h-[300px] bg-teal-500/10 blur-[130px] rounded-full" />
      </div>

      {/* Top Navbar */}
      <nav className="relative z-20 border-b border-slate-800/80 px-6 py-4 backdrop-blur-md bg-slate-950/80 sticky top-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 text-slate-950 font-black flex items-center justify-center text-xl shadow-lg shadow-emerald-500/20">
              T
            </div>
            <div>
              <span className="font-black text-lg tracking-tight text-white">Tap-Order</span>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full ml-2 border border-emerald-500/30">
                SaaS F&B Indonesia
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
            <a href="#fitur" className="hover:text-emerald-400 transition-colors">Fitur</a>
            <a href="#cara-kerja" className="hover:text-emerald-400 transition-colors">Cara Kerja</a>
            <a href="#harga" className="hover:text-emerald-400 transition-colors">Paket Harga</a>
            <a href="#faq" className="hover:text-emerald-400 transition-colors">FAQ</a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-bold text-slate-300 hover:text-white px-3 py-2 rounded-xl hover:bg-slate-900 transition-all"
            >
              Masuk
            </Link>
            <Link
              href="/register"
              className="text-xs font-extrabold text-slate-950 bg-emerald-400 hover:bg-emerald-300 px-4 py-2 rounded-xl shadow-lg shadow-emerald-400/20 transition-all active:scale-95"
            >
              Coba 14 Hari Gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-6 pt-20 pb-16 max-w-4xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Platform Pesanan Meja NFC & QR untuk Kafe, Warung, dan Hotel</span>
        </div>

        <h1 className="text-3xl sm:text-6xl font-black text-white tracking-tight leading-[1.12]">
          Pelanggan <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500">Tap Kartu Meja</span>, Pesanan Seketika Masuk ke Layar Kasir.
        </h1>

        <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          Tamu cukup menempelkan HP ke kartu NFC di meja untuk memilih menu berfoto dan memesan mandiri. Tanpa download aplikasi, tanpa potongan MDR payment gateway, dan pembayaran tetap diselesaikan di kasir Anda.
        </p>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <Link
            href="/register"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <span>Daftarkan Outlet Anda Sekarang</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="https://wa.me/6281234567890?text=Halo%20Tap-Order,%20saya%20mau%20jadwalkan%20demo%20dan%20pemasangan%20kartu%20NFC%20di%20kafe%20saya"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-sm border border-slate-800 transition-all flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4 text-emerald-400" />
            <span>Jadwalkan Demo di Kafe Anda</span>
          </a>
        </div>

        <div className="pt-4 flex items-center justify-center gap-6 text-xs text-slate-400">
          <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> 14 Hari Uji Coba Gratis</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Tanpa Mesin Khusus</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Cukup HP / Tablet Kasir</span>
        </div>
      </section>

      {/* Live Product Interactive Showcase */}
      <section className="relative z-10 px-6 py-10 max-w-5xl mx-auto">
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">Jelajahi Langsung</span>
              <h2 className="text-xl font-black text-white mt-1">Coba Pengalaman Sistem Tap-Order</h2>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-all"
              >
                Masuk ke Outlet Saya
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
            {/* Box 1: Customer Tap Experience */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold mb-3">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-sm text-white">Menu HP Pelanggan (Meja 01)</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Tamu menempelkan HP ke kartu NFC meja atau scan QR. Buka menu instan, pilih varian, dan kirim pesanan.
                </p>
              </div>
              <Link
                href="/c/SNJ001"
                target="_blank"
                className="w-full text-center py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5"
              >
                <span>Buka Menu Meja 01</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Box 2: Cashier Screen & KDS */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold mb-3">
                  <Flame className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-sm text-white">Layar Kasir & Dapur Real-time</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Pesanan masuk seketika dengan alarm audio "Ding!". Kelola antrean dapur, pelunasan kasir, dan cetak struk thermal.
                </p>
              </div>
              <Link
                href="/cashier/kopi-senja"
                target="_blank"
                className="w-full text-center py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5"
              >
                <span>Buka Layar Kasir</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Box 3: Owner Dashboard */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold mb-3">
                  <LayoutDashboard className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-sm text-white">Dashboard Pemilik & Laporan</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Laporan omset harian, saklar 1-klik menu habis, manajemen token kartu NFC, dan cetak lembar QR meja.
                </p>
              </div>
              <Link
                href="/admin/kopi-senja"
                target="_blank"
                className="w-full text-center py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5"
              >
                <span>Buka Dashboard Pemilik</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Core Value Propositions */}
      <section id="fitur" className="relative z-10 px-6 py-16 max-w-5xl mx-auto space-y-12">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Keunggulan Bisnis</span>
          <h2 className="text-2xl sm:text-4xl font-black text-white">Dirancang Spesifik untuk Operasional Resto Lokal</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-base text-white">Bebas Biaya MDR Payment Gateway</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Anda tidak dipotong komisi per transaksi (0.7% - 2%) oleh pihak ketiga. Pembayaran dilakukan langsung di kasir (Tunai, QRIS statis kafe Anda sendiri, atau mesin EDC).
            </p>
          </div>

          <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-base text-white">Pelayan Tidak Bolak-Balik Mencatat</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Di jam sibuk makan siang atau malam, tamu tidak perlu melambaikan tangan menunggu pelayan datang. Pesanan langsung masuk ke kasir dengan nomor meja akurat. Salah catat berkurang 90%.
            </p>
          </div>

          <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Printer className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-base text-white">Cetak Struk Thermal & Kitchen Ticket</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Mendukung cetak struk kasir dan dapur langsung dari browser ke printer thermal 58mm atau 80mm via Bluetooth / USB tanpa perlu beli mesin POS mahal.
            </p>
          </div>

          <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
              <Coffee className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-base text-white">Tandai Menu "Habis" Seketika (1-Klik)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Bahan di dapur habis? Pemilik atau kasir cukup menggeser saklar menu di dashboard. Menu langsung abu-abu dan tidak bisa dipesan pelanggan tanpa perlu cetak ulang lembaran menu.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="harga" className="relative z-10 px-6 py-16 max-w-5xl mx-auto space-y-12">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Harga Transparan</span>
          <h2 className="text-2xl sm:text-4xl font-black text-white">Investasi Ramah untuk Setiap Pemilik Usaha</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Tanpa kontrak jangka panjang. Uji coba gratis 14 hari pertama sebelum mulai berlangganan.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Paket Basic */}
          <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold uppercase text-slate-400">Untuk Warung & Kedai</span>
                <h3 className="text-2xl font-black text-white mt-1">Paket Basic</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">Rp 99.000</span>
                  <span className="text-xs text-slate-400">/ bulan</span>
                </div>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Menu digital + pesan dari meja</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Layar kasir real-time & bill meja</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Input pesanan manual walk-in</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Saklar 1-klik tandai menu habis</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Laporan omset harian</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> 1 akun kasir operasional</li>
              </ul>
            </div>

            <Link
              href="/register"
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs text-center transition-all block"
            >
              Mulai 14 Hari Gratis
            </Link>
          </div>

          {/* Paket Pro */}
          <div className="bg-gradient-to-b from-slate-900 to-emerald-950/40 p-8 rounded-3xl border-2 border-emerald-500/50 space-y-6 flex flex-col justify-between relative shadow-2xl">
            <div className="absolute -top-3 right-6 bg-emerald-500 text-slate-950 text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-md">
              Paling Populer
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold uppercase text-emerald-400">Untuk Kafe & Restoran Ramai</span>
                <h3 className="text-2xl font-black text-white mt-1">Paket Pro</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">Rp 199.000</span>
                  <span className="text-xs text-slate-400">/ bulan</span>
                </div>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-200">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> <b>Semua fitur Paket Basic</b></li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Laporan omset bulanan & metode bayar</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Analitik menu terlaris & jam sibuk</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Rating internal & voucher promo toko</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Riwayat kasir (Audit log anti-fraud)</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Cetak lembar kartu QR meja otomatis</li>
              </ul>
            </div>

            <Link
              href="/register"
              className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs text-center shadow-lg transition-all block"
            >
              Daftar Paket Pro (14 Hari Gratis)
            </Link>
          </div>
        </div>

        {/* Biaya Setup Box */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center max-w-3xl mx-auto space-y-2">
          <p className="font-extrabold text-sm text-white">Layanan Pemasangan di Tempat (Opsional): Rp 350.000 Sekali Bayar</p>
          <p className="text-xs text-slate-400 leading-relaxed">
            Termasuk 10 kartu meja fisik chip NFC NTAG213 siap pakai, jasa input menu & foto awal, serta pelatihan staf kasir langsung di tempat usaha Anda.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 px-6 py-10 text-center text-xs text-slate-500 space-y-2">
        <p className="font-bold text-slate-400">Tap-Order • Platform SaaS Pesanan Meja F&B Indonesia</p>
        <p>© 2026 Tap-Order. Seluruh hak cipta dilindungi undang-undang.</p>
      </footer>
    </div>
  );
}
