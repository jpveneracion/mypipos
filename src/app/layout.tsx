import type { Metadata } from "next";
import "./globals.css";
import Script from 'next/script';
import MyPiPOSBackground from "./components/MyPiPOSBackground";
import GlobalErrorHandlers from "@/components/GlobalErrorHandlers";
import { DM_Sans, JetBrains_Mono, Playfair_Display } from 'next/font/google';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
  weight: ['400', '500'],
});

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair-display',
  display: 'swap',
  weight: ['600', '700', '800'],
});

export const metadata: Metadata = {
  title: "myPiPOS - Universal Pi Commerce Network",
  description: "One Pi account, every myPiPOS merchant. Join the universal commerce network powered by Pi Network.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${dmSans.variable} ${jetBrainsMono.variable} ${playfairDisplay.variable}`}>
      <head>
        {/* Prevent browser extensions from interfering */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="browser-mode" content="application" />
      </head>
      <body suppressHydrationWarning>
        <GlobalErrorHandlers />
        <div className="fixed inset-0" />
        <MyPiPOSBackground />
        <div className="relative z-10 pb-[env(safe-area-inset-bottom)]">{children}</div>
        {/* Load the SDK - strategy="beforeInteractive" ensures it loads before page renders */}
        <Script
          src="https://sdk.minepi.com/pi-sdk.js"
          strategy="beforeInteractive"
        />
      </body>
    </html>
  );
}
