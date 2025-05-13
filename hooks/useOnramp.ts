import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { usePrivyAuth } from '@/components/privy/privy-auth-provider';
import axios from 'axios';

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
  proceedToCheckout: () => Promise<void>;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export function useOnramp(): UseOnrampReturn {
  const { publicKey } = useWallet();
  const { isAuthenticated, walletAddress } = usePrivyAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentQuote, setCurrentQuote] = useState<OnrampQuote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  // Helper function to directly create a Stripe checkout session
  const proceedToCheckout = async () => {
    // Check for either Solana wallet adapter or Privy wallet
    const userAddress = publicKey?.toString() || walletAddress;
    
    if (!userAddress) {
      setError('Please connect your wallet first');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      console.log('Creating Stripe checkout session...');
      
      // Create Stripe checkout session via backend
      const response = await axios.post(`${BACKEND_URL}/api/create-checkout-session`, {
        walletAddress: userAddress,
        email: undefined
      });
      
      if (!response.data?.url) {
        throw new Error('Invalid response from server');
      }

      // Open the Stripe checkout in a new window
      window.open(response.data.url, '_blank');
    } catch (error) {
      console.error('Error creating checkout session:', error);
      setError(error instanceof Error ? error.message : 'Failed to create checkout session');
    } finally {
      setIsProcessing(false);
    }
  };

  // Create a mock quote just for display purposes
  const getQuote = async (amount: number) => {
    // Check for either Solana wallet adapter or Privy wallet
    const userAddress = publicKey?.toString() || walletAddress;
    
    if (!userAddress) {
      setError('Please connect your wallet first');
      return;
    }

    if (!amount || amount <= 0) {
      setError('Invalid amount. Please specify a positive number.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Create a fixed mock quote without any API calls
      const quote: OnrampQuote = {
        provider: "Stripe",
        inputAmount: 1, // $1 USD
        inputCurrency: 'USD',
        outputAmount: 0.1, // 0.1 SOL
        outputCurrency: 'SOL',
        fees: {
          provider: 0,
          network: 0,
          total: 0
        },
        estimatedProcessingTime: "1-2 minutes",
        exchangeRate: 10, // 1 SOL = 10 USD
        network: 'devnet',
        redirectUrl: '' // Will be populated when confirmPurchase is called
      };

      console.log('Created quote:', quote);
      setCurrentQuote(quote);
    } catch (error) {
      console.error('Error in getQuote:', error);
      setError(error instanceof Error ? error.message : 'Failed to create checkout session');
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmPurchase = () => {
    proceedToCheckout(); // Directly proceed to checkout instead of using the quote URL
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
    handleCancel,
    proceedToCheckout
  };
} 
