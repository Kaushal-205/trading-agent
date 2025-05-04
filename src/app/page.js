'use client';

import dynamic from 'next/dynamic';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';

// Dynamically import the TradingAgent component to avoid SSR issues
const TradingAgent = dynamic(() => import('../components/TradingAgent'), {
  ssr: false,
});

// Dynamically import the wallet button to avoid SSR issues
const WalletButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((mod) => mod.WalletMultiButton),
  { ssr: false }
);

export default function Home() {
  const { connected } = useWallet();

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Solana Trading Agent
            </h1>
            <p className="text-gray-600 mt-2">Your AI-powered trading assistant on Solana</p>
          </div>
          <div className="transform hover:scale-105 transition-transform">
            <WalletButton className="!bg-gradient-to-r from-blue-600 to-indigo-600 !rounded-xl" />
          </div>
        </div>
        {connected ? (
          <TradingAgent />
        ) : (
          <div className="flex items-center justify-center h-[calc(100vh-200px)] bg-white rounded-xl shadow-lg">
            <div className="text-center p-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Connect Your Wallet</h2>
              <p className="text-gray-600 mb-6">Please connect your wallet to start using the trading assistant.</p>
              <WalletButton className="!bg-gradient-to-r from-blue-600 to-indigo-600 !rounded-xl" />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
