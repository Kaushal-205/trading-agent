import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, VersionedTransaction } from '@solana/web3.js';

// SOL token mint address
const SOL_MINT = 'So11111111111111111111111111111111111111112';

// Jupiter API base URL
const JUPITER_API_BASE = 'https://lite-api.jup.ag/ultra/v1';

interface SwapQuote {
  requestId: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: string;
  routePlan: Array<{
    swapInfo: {
      ammKey: string;
      label: string;
      inputMint: string;
      outputMint: string;
      inAmount: string;
      outAmount: string;
      feeAmount: string;
      feeMint: string;
    };
    percent: number;
  }>;
  inputMint: string;
  outputMint: string;
  transaction?: string;
  swapType: string;
}

interface SwapResult {
  status: string;
  signature?: string;
  error?: string;
  code?: number;
  inputAmountResult?: string;
  outputAmountResult?: string;
}

interface UseJupiterReturn {
  isLoading: boolean;
  currentQuote: SwapQuote | null;
  swapResult: SwapResult | null;
  error: string | null;
  getQuote: (outputMint: string, amount: number) => Promise<SwapQuote | null>;
  executeSwap: (signedTransaction: string, requestId: string) => Promise<SwapResult | null>;
  clearQuote: () => void;
  clearResult: () => void;
}

export function useJupiter(): UseJupiterReturn {
  const { publicKey, signTransaction } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuote, setCurrentQuote] = useState<SwapQuote | null>(null);
  const [swapResult, setSwapResult] = useState<SwapResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getQuote = async (outputMint: string, amount: number): Promise<SwapQuote | null> => {
    if (!publicKey) {
      setError('Please connect your wallet first');
      return null;
    }

    setIsLoading(true);
    setError(null);

    //TODO: get token decimals from the token data
    try {
      // Find token decimals, would be better to get this from the token data
      // For now using default values based on the token
      let outputDecimals = 6; // Default for most tokens like USDC, BTC
      if (outputMint === 'sctmXxs6Mh9SepYstbVmGzA5saD3GrMLpJ55uTVBVtY'){
        outputDecimals = 9; // For TRUMP
      } else if (outputMint === 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263') {
        outputDecimals = 5; // For BONK
      } else if (outputMint === '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R') {
        outputDecimals = 8; // For DOGE
      }
      
      // Convert the requested output amount to the appropriate decimal representation
      const rawAmount = Math.floor(amount * Math.pow(10, outputDecimals));
      
      // Create URL for Jupiter API with ExactOut mode
      const url = new URL(`${JUPITER_API_BASE}/order`);
      
      // Add query parameters for ExactOut swap mode
      url.searchParams.append('inputMint', SOL_MINT);
      url.searchParams.append('outputMint', outputMint);
      url.searchParams.append('amount', rawAmount.toString());
      url.searchParams.append('taker', publicKey.toString());
      url.searchParams.append('slippageBps', '100'); // 1% slippage
      url.searchParams.append('swapMode', 'ExactOut'); // Specify we want exact output amount
      
      console.log("Jupiter API request URL:", url.toString());
      
      // Fetch quote from Jupiter API
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`Jupiter API error: ${response.status} ${response.statusText}`);
      }
      
      const quote = await response.json();
      console.log("Jupiter API response:", quote);
      setCurrentQuote(quote);
      return quote;
    } catch (error) {
      console.error('Error fetching quote:', error);
      setError(error instanceof Error ? error.message : 'Failed to get quote');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const executeSwap = async (signedTransaction: string, requestId: string): Promise<SwapResult | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${JUPITER_API_BASE}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signedTransaction,
          requestId,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Jupiter API error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      setSwapResult(result);
      return result;
    } catch (error) {
      console.error('Error executing swap:', error);
      setError(error instanceof Error ? error.message : 'Failed to execute swap');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const clearQuote = () => {
    setCurrentQuote(null);
    setError(null);
  };

  const clearResult = () => {
    setSwapResult(null);
    setError(null);
  };

  return {
    isLoading,
    currentQuote,
    swapResult,
    error,
    getQuote,
    executeSwap,
    clearQuote,
    clearResult,
  };
} 
