import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { usePrivyAuth } from '@/components/privy/privy-auth-provider';

interface OnrampQuote {
  provider: string;
  inputAmount: number;
  inputCurrency: string;
  outputAmount: number;
  outputCurrency: string;
  fees: {
    provider: number;
    network: number;
    total: number;
  };
  estimatedProcessingTime: string;
  exchangeRate: number;
  network: string;
  redirectUrl?: string;
}

interface UseOnrampReturn {
  isProcessing: boolean;
  currentQuote: OnrampQuote | null;
  error: string | null;
  getQuote: (amount: number) => Promise<void>;
  confirmPurchase: () => void;
  cancelPurchase: () => void;
  handleSuccess: () => void;
  handleCancel: () => void;
}

// MoonPay sandbox environment
const MOONPAY_WIDGET_URL = 'https://buy-sandbox.moonpay.com';

export function useOnramp(): UseOnrampReturn {
  const { publicKey } = useWallet();
  const { isAuthenticated, walletAddress } = usePrivyAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentQuote, setCurrentQuote] = useState<OnrampQuote | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getQuote = async (amount: number) => {
    // Check for either Solana wallet adapter or Privy wallet
    const userAddress = publicKey?.toString() || walletAddress;
    
    if (!userAddress) {
      setError('Please connect your wallet first');
      return;
    }

    if (!process.env.NEXT_PUBLIC_MOONPAY_PUBLISHABLE_KEY) {
      setError('MoonPay API key is not configured');
      return;
    }

    if (!amount || amount <= 0) {
      setError('Invalid amount. Please specify a positive number.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      console.log('Creating MoonPay purchase URL...');
      console.log('Amount:', amount);
      
      // Create MoonPay URL
      const moonpayUrl = new URL(MOONPAY_WIDGET_URL);
      moonpayUrl.searchParams.append('apiKey', process.env.NEXT_PUBLIC_MOONPAY_PUBLISHABLE_KEY || '');
      moonpayUrl.searchParams.append('currencyCode', 'sol');
      moonpayUrl.searchParams.append('walletAddress', userAddress);
      moonpayUrl.searchParams.append('baseCurrencyAmount', amount.toString());
      moonpayUrl.searchParams.append('baseCurrencyCode', 'usd');
      moonpayUrl.searchParams.append('redirectURL', `${window.location.origin}/chat?status=success`);
      moonpayUrl.searchParams.append('cancelURL', `${window.location.origin}/chat?status=cancel`);
      moonpayUrl.searchParams.append('showWalletAddressForm', 'true');
      moonpayUrl.searchParams.append('network', 'solana');
      moonpayUrl.searchParams.append('environment', 'sandbox');
      moonpayUrl.searchParams.append('colorCode', '#34C759');

      const urlString = moonpayUrl.toString();
      console.log('Generated MoonPay URL:', urlString);

      // Create a mock quote for display purposes
      const quote: OnrampQuote = {
        provider: "MoonPay",
        inputAmount: amount,
        inputCurrency: 'USD',
        outputAmount: amount, // This will be calculated by MoonPay
        outputCurrency: 'SOL',
        fees: {
          provider: 0, // This will be calculated by MoonPay
          network: 0,  // This will be calculated by MoonPay
          total: 0     // This will be calculated by MoonPay
        },
        estimatedProcessingTime: "2-5 minutes",
        exchangeRate: 0, // This will be calculated by MoonPay
        network: 'mainnet-beta',
        redirectUrl: urlString
      };

      console.log('Created quote:', quote);
      setCurrentQuote(quote);
    } catch (error) {
      console.error('Error in getQuote:', error);
      setError(error instanceof Error ? error.message : 'Failed to create purchase URL');
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmPurchase = () => {
    if (!currentQuote?.redirectUrl) {
      setError('No payment URL available');
      return;
    }

    try {
      window.open(currentQuote.redirectUrl, '_blank');
      setCurrentQuote(null);
    } catch (error) {
      console.error('Error opening payment page:', error);
      setError('Failed to open payment page');
    }
  };

  const cancelPurchase = () => {
    setCurrentQuote(null);
    setError(null);
  };

  const handleSuccess = () => {
    setCurrentQuote(null);
    setError(null);
  };

  const handleCancel = () => {
    setCurrentQuote(null);
    setError(null);
  };

  return {
    isProcessing,
    currentQuote,
    error,
    getQuote,
    confirmPurchase,
    cancelPurchase,
    handleSuccess,
    handleCancel
  };
} 
