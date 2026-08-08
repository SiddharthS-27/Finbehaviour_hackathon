import type { Metadata, Viewport } from "next";
import { Fraunces, Instrument_Sans, IBM_Plex_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { StaleSaveNotice } from "@/components/StaleSaveNotice";
import "./globals.css";

/* Display — headings, month numbers, the archetype name. Large sizes only.
   SOFT/WONK are set in globals.css via font-variation-settings. */
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
});

/* Body — all prose, labels, buttons. */
const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  display: "swap",
});

/* Numerals — every rupee amount without exception, tabular figures. */
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LifeLedger — two years of your money, in twenty minutes",
  description:
    "You are 23, first job in Chennai, ₹42,000 a month. Twelve months of decisions that compound. See what the gap cost you, in rupees.",
  applicationName: "LifeLedger",
  // Safari ignores the web manifest for install behaviour — these are the tags
  // that actually make it launch full-screen from the home screen.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LifeLedger",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // viewport-fit=cover, so env(safe-area-inset-*) resolves to real values and
  // the advance button can clear the iOS home indicator.
  viewportFit: "cover",
  themeColor: "#12301F",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`dark ${fraunces.variable} ${instrumentSans.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-ink text-chalk antialiased">
        {children}
        <Toaster theme="dark" position="top-center" />
        <StaleSaveNotice />
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
