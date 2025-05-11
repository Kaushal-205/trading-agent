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
    <main className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-12">
          <div className="text-center sm:text-left mb-6 sm:mb-0">
            <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Solana Trading Agent
            </h1>
            <p className="text-gray-600 mt-3 text-lg">Your AI-powered trading assistant on Solana</p>
          </div>
          <div className="transform hover:scale-105 transition-all duration-200">
            <WalletButton className="!bg-gradient-to-r from-blue-600 to-indigo-600 !rounded-xl !shadow-lg hover:!shadow-xl" />
          </div>
        </div>
        {connected ? (
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 backdrop-blur-sm">
            <TradingAgent />
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12 max-w-md w-full text-center backdrop-blur-sm">
              <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800 mb-4">Connect Your Wallet</h2>
              <p className="text-gray-600 mb-8 text-lg">Please connect your wallet to start using the trading assistant.</p>
              <div className="transform hover:scale-105 transition-all duration-200">
                <WalletButton className="!bg-gradient-to-r from-blue-600 to-indigo-600 !rounded-xl !shadow-lg hover:!shadow-xl" />
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
