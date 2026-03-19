import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import { SmoothScrollProvider } from "@/components/providers/smooth-scroll-provider";
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
    default: 'Devora Buki — Reservas online para profesionales',
    template: '%s | Devora Buki',
  },
  description:
    'La plataforma todo-en-uno para gestionar turnos, cobrar señas y automatizar recordatorios. Creá tu página de reservas en 2 minutos. Sin tarjeta de crédito.',
  keywords: [
    'reservas online',
    'turnos online',
    'agenda profesional',
    'sistema de citas argentina',
    'cobrar señas mercado pago',
    'recordatorios automáticos',
    'plataforma de reservas',
    'gestión de turnos',
  ],
  authors: [{ name: 'Devora Buki' }],
  creator: 'Devora Buki',
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    url: appUrl,
    siteName: 'Devora Buki',
    title: 'Devora Buki — Tu negocio, sin el caos.',
    description:
      'Reservas online, pagos automáticos y recordatorios. La plataforma diseñada para profesionales independientes en Argentina.',
    images: [
      {
        url: '/og/home.png',
        width: 1200,
        height: 630,
        alt: 'Devora Buki — Reservas online para profesionales',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Devora Buki — Tu negocio, sin el caos.',
    description:
      'Reservas online, pagos automáticos y recordatorios. La plataforma diseñada para profesionales independientes en Argentina.',
    images: ['/og/home.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
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
          <SmoothScrollProvider>
            {children}
          </SmoothScrollProvider>
        </ToastProvider>
      </body>
    </html>
  );
}

