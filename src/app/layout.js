import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SolanaWalletProvider from '@/providers/WalletProvider';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Solana Trading Assistant",
  description: "AI-powered Solana trading assistant",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-full bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100`}
      >
        <SolanaWalletProvider>
          <div className="min-h-full">
            {children}
          </div>
        </SolanaWalletProvider>
      </body>
    </html>
  );
}
