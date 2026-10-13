import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tap-Order | Menu & Pesanan Meja NFC/QR',
  description: 'Sistem Pesan Meja Berbasis NFC & QR dengan Layar Kasir Real-time untuk Kafe & Restoran',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased min-h-screen text-slate-800 bg-slate-50">
        {children}
      </body>
    </html>
  );
}
