import type { Metadata } from "next";
import Image from "next/image";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MCRRC Run Finder",
  description:
    "Find weekly drop-in group runs near you in Montgomery County, MD",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <header className="sticky top-0 z-30 flex items-center justify-between bg-brand-navy px-4 py-3">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/mcrrc-logo.png"
              alt="MCRRC logo"
              width={36}
              height={36}
              className="rounded-full"
            />
            <div className="flex flex-col">
              <span className="text-lg font-bold leading-tight text-white">
                Run Finder
              </span>
              <span className="text-xs text-gray-300">
                A Place For Every Pace
              </span>
            </div>
          </Link>
        </header>
        {children}
      </body>
    </html>
  );
}
