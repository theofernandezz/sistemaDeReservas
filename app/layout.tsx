import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import { getAppUrl } from "@/lib/config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
});

const appUrl = getAppUrl()

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'Buki - Sistema de Reservas para Profesionales',
    template: '%s | Buki',
  },
  description: 'Plataforma de reservas online para profesionales. Automatiza citas, pagos con Mercado Pago y recordatorios.',
  keywords: ['reservas online', 'agenda turnos', 'sistema de citas', 'argentina', 'mercado pago', 'automatización'],
  authors: [{ name: 'Buki' }],
  creator: 'Buki',
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    url: appUrl,
    siteName: 'Buki',
    title: 'Buki - Sistema de Reservas para Profesionales',
    description: 'Automatiza citas, pagos y recordatorios.',
    images: [{ url: '/og/home.png', width: 1200, height: 630, alt: 'Buki' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Buki - Sistema de Reservas',
    description: 'Automatiza citas, pagos y recordatorios.',
    images: ['/og/home.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} antialiased`}
      >
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}

