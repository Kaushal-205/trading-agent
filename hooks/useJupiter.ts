import { useState } from 'react';
import { usePrivyAuth } from '@/components/privy/privy-auth-provider';
import { useWallet } from '@solana/wallet-adapter-react';

// SOL token mint address
const SOL_MINT = 'So11111111111111111111111111111111111111112';

// Jupiter API base URL
const JUPITER_API_BASE = 'https://lite-api.jup.ag/ultra/v1';

interface RouteInfo {
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
}

interface OrderResponse {
  requestId: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: string;
  routePlan: RouteInfo[];
  inputMint: string;
  outputMint: string;
  swapType: string;
  transaction: string;
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
  orderResponse: OrderResponse | null;
  swapResult: SwapResult | null;
  error: string | null;
  getOrder: (outputMint: string, amount: number) => Promise<OrderResponse | null>;
  executeSwap: (signedTransaction: string) => Promise<SwapResult | null>;
  clearOrder: () => void;
  clearResult: () => void;
}

export function useJupiter(): UseJupiterReturn {
  const { isAuthenticated, walletAddress } = usePrivyAuth();
  const { publicKey } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [orderResponse, setOrderResponse] = useState<OrderResponse | null>(null);
  const [swapResult, setSwapResult] = useState<SwapResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get order directly with transaction included
  const getOrder = async (outputMint: string, amount: number): Promise<OrderResponse | null> => {
    const userAddress = walletAddress || publicKey?.toString();

    if (!userAddress) {
      setError('Please connect your wallet first');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Find token decimals based on the token
      let outputDecimals = 6; // Default for most tokens like USDC
      if (outputMint === 'sctmXxs6Mh9SepYstbVmGzA5saD3GrMLpJ55uTVBVtY'){
        outputDecimals = 9; // For TRUMP
      } else if (outputMint === 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263') {
        outputDecimals = 5; // For BONK
      } else if (outputMint === '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R') {
        outputDecimals = 8; // For DOGE
      }
      
      // Convert the requested output amount to the appropriate decimal representation
      const rawAmount = Math.floor(amount * Math.pow(10, outputDecimals));
      
      // Call directly to /order endpoint with query parameters
      const orderUrl = new URL(`${JUPITER_API_BASE}/order`);
      
      // Add query parameters for ExactOut swap mode
      orderUrl.searchParams.append('inputMint', SOL_MINT);
      orderUrl.searchParams.append('outputMint', outputMint);
      orderUrl.searchParams.append('amount', rawAmount.toString());
      orderUrl.searchParams.append('slippageBps', '100'); // 1% slippage
      orderUrl.searchParams.append('swapMode', 'ExactOut'); // Specify we want exact output amount
      orderUrl.searchParams.append('taker', userAddress);
      
      console.log("Jupiter API order URL:", orderUrl.toString());
      
      const orderResponse = await fetch(orderUrl.toString());
      
      if (!orderResponse.ok) {
        const errorText = await orderResponse.text();
        console.error("Jupiter API order error:", errorText);
        throw new Error(`Jupiter API order error: ${orderResponse.status} ${orderResponse.statusText}`);
      }
      
      const orderResult: OrderResponse = await orderResponse.json();
      console.log("Jupiter API order response:", orderResult);
      
      setOrderResponse(orderResult);
      return orderResult;
    } catch (error) {
      console.error('Error getting order:', error);
      setError(error instanceof Error ? error.message : 'Failed to get order');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Execute the order after the user has signed the transaction
  const executeSwap = async (signedTransaction: string): Promise<SwapResult | null> => {
    if (!orderResponse) {
      setError('No order available. Please get an order first.');
      return null;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Call the execute endpoint with the signed transaction
      const executeUrl = new URL(`${JUPITER_API_BASE}/execute`);
      
      const executeData = {
        signedTransaction: signedTransaction,
        requestId: orderResponse.requestId
      };
      
      console.log("Jupiter API execute request:", JSON.stringify(executeData, null, 2));
      
      const executeResponse = await fetch(executeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(executeData)
      });
      
      if (!executeResponse.ok) {
        const errorText = await executeResponse.text();
        console.error("Jupiter API execute error response:", errorText);
        throw new Error(`Jupiter API execute error: ${executeResponse.status} ${executeResponse.statusText}`);
      }
      
      const executeResult = await executeResponse.json();
      console.log("Jupiter API execute response:", executeResult);
      
      const result: SwapResult = {
        status: executeResult.status || 'Success',
        signature: executeResult.signature, // Use the signature from the execute response
        inputAmountResult: executeResult.inputAmountResult,
        outputAmountResult: executeResult.outputAmountResult
      };
      
      setSwapResult(result);
      return result;
    } catch (error) {
      console.error('Error executing swap:', error);
      setError(error instanceof Error ? error.message : 'Failed to execute swap');
      
      // Even on error, we still want to return a result object
      const errorResult: SwapResult = {
        status: 'Error',
        error: error instanceof Error ? error.message : 'Failed to execute swap'
      };
      
      setSwapResult(errorResult);
      return errorResult;
    } finally {
      setIsLoading(false);
    }
  };

  const clearOrder = () => {
    setOrderResponse(null);
    setError(null);
  };

  const clearResult = () => {
    setSwapResult(null);
    setError(null);
  };

  return {
    isLoading,
    orderResponse,
    swapResult,
    error,
    getOrder,
    executeSwap,
    clearOrder,
    clearResult,
  };
} 
