import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

const WalletConnect = () => {
  const { publicKey } = useWallet();

  return (
    <div className="flex items-center space-x-4">
      <WalletMultiButton className="!bg-blue-500 hover:!bg-blue-600" />
      {publicKey && (
        <div className="text-sm text-gray-600">
          Connected: {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
        </div>
      )}
    </div>
  );
};

export default WalletConnect; 