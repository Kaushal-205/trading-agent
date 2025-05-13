"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [transactionData, setTransactionData] = useState<{
    status: string;
    txSignature?: string;
    walletAddress?: string;
    message?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [finalState, setFinalState] = useState(false);

  useEffect(() => {
    async function fetchPaymentStatus() {
      if (!sessionId) {
        setError("No session ID provided");
        setLoading(false);
        setFinalState(true);
        return;
      }

      try {
        console.log(`Fetching payment status for session ${sessionId}...`);
        const response = await axios.get(`${BACKEND_URL}/api/payment-status/${sessionId}`);
        console.log("Payment status response:", response.data);
        
        setTransactionData(response.data);
        
        // If we have a transaction signature or hit max retries, stop polling
        if (response.data.txSignature || retryCount > 10) {
          setLoading(false);
          setFinalState(true);
        } else {
          // If still processing (no txSignature yet), continue loading but allow showing partial info
          setLoading(false);
          
          // Set a timeout to retry if we don't have complete data yet
          if (retryCount < 10) {
            setTimeout(() => {
              setRetryCount(prevCount => prevCount + 1);
            }, 2000); // Try again in 2 seconds
          } else {
            // After max retries, consider this the final state
            setFinalState(true);
          }
        }
      } catch (err) {
        console.error("Error fetching payment status:", err);
        setError("Failed to load transaction details. Your SOL will still be delivered if the payment was successful.");
        setLoading(false);
        
        // Retry a few times even on error
        if (retryCount < 5) {
          setTimeout(() => {
            setRetryCount(prevCount => prevCount + 1);
          }, 3000); // Try again in 3 seconds after error
        } else {
          setFinalState(true);
        }
      }
    }

    if (!finalState) {
      fetchPaymentStatus();
    }
  }, [sessionId, retryCount, finalState]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4 text-center">Payment Successful!</h1>
        
        {loading ? (
          <div className="flex flex-col items-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mb-4"></div>
            <p className="text-gray-300">Loading transaction details...</p>
          </div>
        ) : error ? (
          <div className="text-center py-6">
            <p className="text-red-400 mb-4">{error}</p>
            <p className="text-gray-300">Your payment was successful and 0.1 SOL will be transferred to your wallet shortly.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-center text-lg mb-2">
                <span className="text-green-400 font-bold">0.1 SOL</span> has been transferred to your wallet
              </p>
              
              {!transactionData?.txSignature && !finalState && (
                <div className="flex items-center justify-center my-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-green-500 mr-2"></div>
                  <p className="text-sm text-gray-300">Processing transaction...</p>
                </div>
              )}
              
              {transactionData?.txSignature ? (
                <div className="text-center">
                  <a 
                    href={`https://explorer.solana.com/tx/${transactionData.txSignature}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline text-sm break-all"
                  >
                    View Transaction
                  </a>
                </div>
              ) : (
                <div className="text-center text-sm text-gray-300 mt-2">
                  {finalState ? 
                    "Transaction details currently unavailable. The SOL will still be transferred to your wallet." :
                    "Waiting for transaction confirmation..."}
                </div>
              )}
              
              {transactionData?.walletAddress && (
                <p className="text-xs text-gray-400 mt-2 text-center break-all">
                  Wallet: {transactionData.walletAddress}
                </p>
              )}
            </div>
            
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-center text-lg">
                Your payment will be <span className="text-green-400 font-bold">automatically refunded</span> to your original payment method.
              </p>
              <p className="text-center text-sm text-gray-400 mt-2">
                This may take 5-7 business days depending on your bank.
              </p>
            </div>
            
            <div className="mt-6 text-center">
              <p className="text-gray-400 text-sm">
                Thank you for using our service! You can now close this window.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 