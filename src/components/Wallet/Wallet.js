'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function Wallet() {
  const { publicKey } = useWallet();

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4">
        {publicKey && (
          <div className="text-sm text-gray-600">
            Address: <span className="font-semibold">{publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}</span>
          </div>
        )}
      </div>

      <WalletMultiButton />
    </div>
  );
} 