import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Fraunces, Source_Serif_4 } from "next/font/google";
import { InstallApp } from "@/components/install-app";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  applicationName: "Bless Writes",
  title: {
    default: "Bless Writes — Books by Bless Laweh Koranteng",
    template: "%s · Bless Writes",
  },
  description:
    "The memoirs of Ghanaian author Bless Laweh Koranteng: Faith Beyond My Resources and From a Five-Cedi Mat to First Class. Read an excerpt, then continue in the full edition.",
  authors: [{ name: "Bless Laweh Koranteng" }],
  creator: "Bless Laweh Koranteng",
  // Installing from iOS uses these tags rather than the manifest alone.
  appleWebApp: {
    capable: true,
    title: "Bless Writes",
    statusBarStyle: "default",
  },
  // Next 16 emits the newer `mobile-web-app-capable` tag. Keep Apple's
  // historical spelling too so older iOS versions also launch standalone.
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
  icons: {
    icon: [
      { url: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#3a6049",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${sourceSerif.variable} antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <PwaRegister />
        {children}
        <InstallApp />
      </body>
    </html>
  );
}