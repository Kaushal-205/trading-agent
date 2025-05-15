import { useState } from 'react';
import { usePrivyAuth } from '@/components/privy/privy-auth-provider';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, VersionedTransaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, NATIVE_MINT } from '@solana/spl-token';
import {
  Raydium,
  DEVNET_PROGRAM_ID,
  TxVersion,
  CurveCalculator,
  CpmmPoolInfoLayout
} from '@raydium-io/raydium-sdk-v2';
import BN from 'bn.js';
import Decimal from 'decimal.js';

// For devnet RPC endpoint
const DEVNET_RPC_ENDPOINT = 'https://api.devnet.solana.com';

// For mainnet RPC endpoint
const connection = new Connection(process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL || 'https://api.mainnet-beta.solana.com', 'confirmed');

// Helper function to format token amounts
function formatTokenAmount(amount: BN, decimals: number): string {
  return new Decimal(amount.toString()).div(new Decimal(10).pow(decimals)).toString();
}

interface RouteInfo {
  poolId: string;
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
}

interface OrderResponse {
  requestId: string;
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  priceImpactPct: number;
  slippageBps: number;
  pool: string;
  poolInfo: any;
  poolKeys: any;
  swapData: {
    baseIn: boolean;
    inputAmount: string;
    outputAmount: string;
  };
}

interface SwapResult {
  status: string;
  signature?: string;
  error?: string;
  code?: number;
  inputAmountResult?: string;
  outputAmountResult?: string;
}

interface UseRaydiumReturn {
  isLoading: boolean;
  orderResponse: OrderResponse | null;
  swapResult: SwapResult | null;
  error: string | null;
  getOrder: (outputMint: string, amount: number) => Promise<OrderResponse | null>;
  executeSwap: (transaction?: VersionedTransaction) => Promise<SwapResult | null>;
  clearOrder: () => void;
  clearResult: () => void;
}

export function useRaydium(): UseRaydiumReturn {
  const { isAuthenticated, walletAddress, sendTransaction } = usePrivyAuth();
  const { publicKey } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [orderResponse, setOrderResponse] = useState<OrderResponse | null>(null);
  const [swapResult, setSwapResult] = useState<SwapResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] = useState<Connection | null>(null);
  
  // Initialize connection if not already initialized
  const getConnection = (): Connection => {
    if (!connection) {
      const newConnection = new Connection(DEVNET_RPC_ENDPOINT, 'confirmed');
      setConnection(newConnection);
      return newConnection;
    }
    return connection;
  };

  /**
   * Function to find a CPMM pool by token mint addresses
   * @param mintA First token mint address (SOL)
   * @param mintB Second token mint address (target token)
   * @returns The pool ID if found, null otherwise
   */
  const findPoolByMints = async (
    mintA: PublicKey,
    mintB: PublicKey
  ): Promise<string | null> => {
    const conn = getConnection();
    console.log(`Searching for pool with mints: ${mintA.toString()} and ${mintB.toString()}`);

    try {
      // Get all pools accounts on devnet that match the CPMM layout
      const accounts = await conn.getProgramAccounts(
        DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM,
        {
          filters: [
            { dataSize: CpmmPoolInfoLayout.span },
          ],
        }
      );
      console.log(`Found ${accounts.length} CPMM pools on devnet`);

      // Check each pool to see if it matches our token mints
      for (const account of accounts) {
        const poolInfo = CpmmPoolInfoLayout.decode(account.account.data);

        // Check if this pool contains our tokens (in either order)
        const poolHasTokens = (
          (poolInfo.mintA.equals(mintA) && poolInfo.mintB.equals(mintB)) ||
          (poolInfo.mintA.equals(mintB) && poolInfo.mintB.equals(mintA))
        );

        if (poolHasTokens) {
          console.log(`Found matching pool: ${account.pubkey.toString()}`);
          return account.pubkey.toString();
        }
      }

      console.log("No matching pool found for these token mints");
      return null;
    } catch (error) {
      console.error("Error searching for pool:", error);
      return null;
    }
  };

  /**
   * Get order for swapping SOL to exact amount of token (ExactOut)
   */
  const getOrder = async (outputMint: string, amount: number): Promise<OrderResponse | null> => {
    const userAddress = walletAddress || publicKey?.toString();

    if (!userAddress) {
      setError('Please connect your wallet first');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const conn = getConnection();
      
      // Initialize Raydium - first without an owner for pool lookup and calculation
      const raydium = await Raydium.load({
        connection: conn,
        cluster: 'devnet',
        disableFeatureCheck: true,
        disableLoadToken: true,
      });
      
      // Get token decimals
      // First check if we have this token in our token.json
      // For now, handle common decimals - this should be replaced with a proper token lookup
      let outputDecimals = 6; // Default for most tokens
      
      if (outputMint === 'bVfhihtqyopGwZTMYZRm14NW9ZveFQkxWBeoEFPLv9h') {
        outputDecimals = 9; // WALLET token
      } else if (outputMint === '4pqFVT2emoqUPH76Nf9TSRxRce7EZCMaMzt4RX3Y3Hz5') {
        outputDecimals = 9; // FAME token
      } else if (outputMint === 'sctmXxs6Mh9SepYstbVmGzA5saD3GrMLpJ55uTVBVtY') {
        outputDecimals = 9; // TRUMP token
      } else if (outputMint === 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263') {
        outputDecimals = 5; // BONK token
      } else if (outputMint === '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R') {
        outputDecimals = 8; // DOGE token
      }
      
      // Convert desired token amount to lamports (or equivalent smallest unit)
      const outputAmount = new BN(Math.floor(amount * Math.pow(10, outputDecimals)));
      const outputMintPubkey = new PublicKey(outputMint);
      const inputMint = NATIVE_MINT;
      
      // Find pool for SOL-Token
      const poolId = await findPoolByMints(inputMint, outputMintPubkey);
      
      if (!poolId) {
        throw new Error(`No pool found for SOL and this token`);
      }
      
      // Get pool information
      console.log('Fetching pool information...');
      const poolData = await raydium.cpmm.getPoolInfoFromRpc(poolId);
      const { poolInfo, rpcData } = poolData;
      
      // Check if token mint is in the pool
      if (
        !outputMintPubkey.equals(new PublicKey(poolInfo.mintA.address)) && 
        !outputMintPubkey.equals(new PublicKey(poolInfo.mintB.address))
      ) {
        throw new Error('Output mint does not match pool');
      }
      
      // For swapBaseOut, we need to determine if the output token is mintA or mintB
      const outputIsA = outputMintPubkey.toBase58() === poolInfo.mintA.address;
      
      // Use swapBaseOut to calculate the required input amount
      const swapResult = CurveCalculator.swapBaseOut({
        poolMintA: poolInfo.mintA,
        poolMintB: poolInfo.mintB,
        tradeFeeRate: rpcData.configInfo!.tradeFeeRate,
        baseReserve: rpcData.baseReserve,
        quoteReserve: rpcData.quoteReserve,
        outputMint: outputMintPubkey,
        outputAmount: outputAmount,
      });
      
      console.log(`To get ${formatTokenAmount(outputAmount, outputDecimals)} of token, you need:
                  ${formatTokenAmount(swapResult.amountIn, 9)} SOL`);
      
      // Calculate price impact percentage (use 2 decimals)
      const priceImpactPct = parseFloat((swapResult.priceImpact * 100).toFixed(2));
      
      // For swapBaseOut, we need to determine if the input is A or B
      const baseIn = !outputIsA; // If output is A, then input is B (SOL)

      // Create the order response
      const orderResult: OrderResponse = {
        requestId: Date.now().toString(), // Generate a unique ID
        inputMint: NATIVE_MINT.toBase58(),
        outputMint: outputMint,
        inAmount: swapResult.amountIn.toString(),
        outAmount: outputAmount.toString(),
        priceImpactPct: priceImpactPct,
        slippageBps: 100, // 1% slippage
        pool: poolId,
        poolInfo: poolInfo,
        poolKeys: poolData.poolKeys,
        swapData: {
          baseIn: baseIn,
          inputAmount: swapResult.amountIn.toString(),
          outputAmount: outputAmount.toString()
        }
      };
      
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
  
  /**
   * Execute the swap with the stored swap parameters
   */
  const executeSwap = async (transaction?: VersionedTransaction): Promise<SwapResult | null> => {
    if (!walletAddress && !publicKey) {
      setError('Please connect your wallet first');
      return null;
    }

    if (!orderResponse) {
      setError('No order information available. Please get an order first.');
      return null;
    }

    // If we already have a successful result with a signature, don't process again
    if (swapResult && swapResult.status === 'Success' && swapResult.signature) {
      console.log('Swap already completed with signature:', swapResult.signature);
      return swapResult;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const conn = getConnection();
      
      // Get the user's public key
      const userPublicKey = publicKey || (walletAddress ? new PublicKey(walletAddress) : null);
      
      if (!userPublicKey) {
        throw new Error("No wallet public key available");
      }
      
      console.log('Creating transaction with wallet:', userPublicKey.toString());
      console.log('Using pool:', orderResponse.pool);
      
      // Initialize Raydium WITH the owner for transaction creation
      const raydium = await Raydium.load({
        owner: userPublicKey,
        connection: conn,
        cluster: 'mainnet-beta',
        disableFeatureCheck: true,
        disableLoadToken: true,
      });
      
      console.log('Raydium initialized with owner, preparing swap transaction...');
      
      // Recreate the transaction using the stored parameters
      const { transaction: txObject } = await raydium.cpmm.swap({
        poolInfo: orderResponse.poolInfo,
        poolKeys: orderResponse.poolKeys,
        inputAmount: new BN(0), // Not used when fixedOut is true
        fixedOut: true,
        swapResult: {
          sourceAmountSwapped: new BN(orderResponse.swapData.inputAmount),
          destinationAmountSwapped: new BN(orderResponse.swapData.outputAmount)
        },
        slippage: 0.01, // 1% slippage
        baseIn: orderResponse.swapData.baseIn,
      });
      
      if (!txObject) {
        throw new Error('Failed to create transaction');
      }
      
      console.log('Transaction created successfully, setting blockhash...');
      
      // Explicitly set a recent blockhash on the transaction
      const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash('finalized');
      
      if ('version' in txObject) {
        // It's a VersionedTransaction
        txObject.message.recentBlockhash = blockhash;
        console.log('Set blockhash on VersionedTransaction:', blockhash);
      } else if ('recentBlockhash' in txObject) {
        // It's a legacy Transaction
        txObject.recentBlockhash = blockhash;
        console.log('Set blockhash on legacy Transaction:', blockhash);
      } else {
        throw new Error('Unknown transaction type');
      }
      
      console.log('Transaction prepared with blockhash:', blockhash);
      console.log('Sending transaction...');
      
      // Sign and send the transaction using Privy
      let signature;
      
      if (sendTransaction) {
        // Capture any potential error messages during signing/sending
        try {
          // Check which wallet is active and use the appropriate method
          if (isAuthenticated && walletAddress) {
            console.log('Using Privy wallet for signing and sending');
            signature = await sendTransaction(txObject, conn);
          } else if (publicKey) {
            console.log('Using Solana wallet adapter for signing and sending');
            signature = await sendTransaction(txObject, conn);
          } else {
            throw new Error('No wallet connected for signing');
          }
          
          console.log('Transaction sent successfully with signature:', signature);
        } catch (e) {
          console.error('Error during transaction signing/sending:', e);
          throw new Error(`Transaction signing failed: ${e instanceof Error ? e.message : String(e)}`);
        }
      } else {
        throw new Error('No sendTransaction method available');
      }
      
      // Wait for confirmation
      console.log('Waiting for transaction confirmation...');
      await conn.confirmTransaction(signature!, 'confirmed');
      
      // Get the transaction details for result info
      const txDetails = await conn.getTransaction(signature, {
        maxSupportedTransactionVersion: 0
      });
      
      console.log("Transaction confirmed:", signature);
      console.log("Transaction details:", txDetails);
      
      const result: SwapResult = {
        status: 'Success',
        signature,
        // We don't have exact amounts from the transaction, but could extract if needed
        inputAmountResult: orderResponse?.inAmount,
        outputAmountResult: orderResponse?.outAmount
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
