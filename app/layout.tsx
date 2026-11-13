import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Fraunces, Source_Serif_4 } from "next/font/google";
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
  title: {
    default: "Bless Writes — Books by Bless Laweh Koranteng",
    template: "%s · Bless Writes",
  },
  description:
    "The memoirs of Ghanaian author Bless Laweh Koranteng: Faith Beyond My Resources and From a Five-Cedi Mat to First Class. Read an excerpt, then continue in the full edition.",
  authors: [{ name: "Bless Laweh Koranteng" }],
  creator: "Bless Laweh Koranteng",
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
      </body>
    </html>
  );
}