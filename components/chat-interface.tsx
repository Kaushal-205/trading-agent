"use client"
import { useRef, useEffect } from "react"
import { Connection, clusterApiUrl, PublicKey, VersionedTransaction } from "@solana/web3.js"
import { cn } from "@/lib/utils"
import tokenList from '../token.json'
import config from '../lib/config'
import { getAlchemyConnection, processLLMResponse, generateMessageId, extractTokenSymbolFromYieldQuery } from './chat/utils'
import { submitSolendLend } from './chat/solend-service'
import {
  useChatState,
  useWalletState,
  useOnrampState,
  useJupiterState,
  useRaydiumState,
  useLendingState,
  usePassiveIncomeState,
  useLendingOptions
} from './chat/hooks'
import { ChatMessage } from './chat/ChatMessage'
import { QuoteWidget } from './chat/QuoteWidget'
import { SwapWidget } from './chat/SwapWidget'
import { SolendPoolsWidget } from './chat/SolendPoolsWidget'
import { LendingConfirmWidget } from './chat/LendingConfirmWidget'
import { ChatInputArea } from './chat/ChatInputArea'
import { SolendPool } from './chat/types'

export default function ChatInterface() {
  // Use the custom hooks to manage state
  const {
    messages,
    setMessages,
    input,
    setInput,
    isTyping,
    setIsTyping
  } = useChatState();

  // Reference to track processed transaction signatures to avoid duplicates
  const processedTransactions = useRef<Set<string>>(new Set());

  const {
    connected,
    publicKey,
    sendTransaction,
    signTransaction,
    isAuthenticated,
    walletAddress,
    privySendTransaction,
    activeWalletAddress,
    isWalletConnected
  } = useWalletState();
  const {
    isProcessing: isProcessingBuy,
    currentQuote,
    error: onrampError,
    getQuote,
    confirmPurchase,
    cancelPurchase,
    handleSuccess,
    handleCancel,
    proceedToCheckout
  } = useOnrampState();

  // Use Raydium for devnet swaps instead of Jupiter
  const {
    isLoading: isLoadingSwap,
    orderResponse: raydiumOrder,
    swapResult,
    error: raydiumError,
    getOrder: getRaydiumOrder,
    executeSwap,
    clearOrder: clearRaydiumOrder,
    clearResult: clearSwapResult,
    swapQuoteWidget,
    setSwapQuoteWidget,
    isSwapProcessing,
    setIsSwapProcessing
  } = useRaydiumState();

  const {
    solendPools,
    setSolendPools,
    lendingToken,
    setLendingToken,
    lendingAmount,
    setLendingAmount,
    selectedPool,
    setSelectedPool,
    showLendingConfirm,
    setShowLendingConfirm
  } = useLendingState();

  const {
    passiveIncomeMessageId,
    setPassiveIncomeMessageId,
    passiveIncomeHandlers,
    setPassiveIncomeHandlers
  } = usePassiveIncomeState();

  const { showLendingOptions } = useLendingOptions(
    setMessages,
    setLendingToken,
    setSolendPools
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Helper function to find token by name or symbol
  const findToken = (tokenName: string) => {
    const normalizedTokenName = tokenName.toLowerCase();
    return tokenList.find(token =>
      token.symbol.toLowerCase() === normalizedTokenName ||
      token.name.toLowerCase().includes(normalizedTokenName)
    );
  };

  // Function to handle passive income prompt
  const handlePassiveIncomePrompt = async (tokenSymbol: string) => {
    // Find token in the token list to get both symbol and mint
    const token = findToken(tokenSymbol);
    if (!token || !token.address) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `I couldn't find details for ${tokenSymbol} in our supported tokens list.`,
        messageId: generateMessageId()
      }]);
      return;
    }

    const promptMsgId = generateMessageId();
    setMessages(prev => [...prev, {
      role: "assistant",
      content: `Would you like to earn passive income with your ${token.symbol}? I can show you some safe lending options.`,
      messageId: promptMsgId
    }]);

    // Create a promise that resolves when user clicks a button
    return new Promise<boolean>((resolve) => {
      const handleConfirm = () => {
        // First remove the passive income handlers to prevent duplicate triggers
        setPassiveIncomeHandlers(null);

        // Also clear the passive income message ID to prevent rendering options
        setPassiveIncomeMessageId(null);

        // Remove the option buttons by updating the message
        setMessages(prev => prev.map(msg =>
          msg.messageId === promptMsgId
            ? { ...msg, options: undefined }
            : msg
        ));

        // Then add user message and resolve
        setMessages(prev => [
          ...prev,
          {
            role: "user",
            content: "Sure, show me lending options",
            messageId: generateMessageId()
          }
        ]);

        resolve(true);

        // Immediately start looking up options with the correct token address
        console.log('Showing lending options for token:', token.symbol, 'address:', token.address);
        showLendingOptions(token.symbol, token.address);
      };

      const handleDecline = () => {
        // First remove the passive income handlers to prevent duplicate triggers
        setPassiveIncomeHandlers(null);

        // Also clear the passive income message ID to prevent rendering options
        setPassiveIncomeMessageId(null);

        // Remove the option buttons by updating the message
        setMessages(prev => prev.map(msg =>
          msg.messageId === promptMsgId
            ? { ...msg, options: undefined }
            : msg
        ));

        // Then add user message and resolve
        setMessages(prev => [
          ...prev,
          {
            role: "user",
            content: "I'm okay, thanks",
            messageId: generateMessageId()
          }
        ]);

        resolve(false);

        setMessages(prev => [...prev, {
          role: "assistant",
          content: "No problem! You can always check lending options later by asking me about yield opportunities.",
          messageId: generateMessageId()
        }]);
      };

      setPassiveIncomeHandlers({ onConfirm: handleConfirm, onDecline: handleDecline });
      setPassiveIncomeMessageId(promptMsgId);

      // Add options to the prompt message
      setMessages(prev => prev.map(msg =>
        msg.messageId === promptMsgId
          ? {
            ...msg,
            passiveIncomeOptions: [
              {
                'choice': 'Sure',
                'action': 'showLendingOptions'
              },
              {
                'choice': 'I\'m okay, thanks',
                'action': ''
              }
            ]
          }
          : msg
      ));
    });
  };

  // Add effect to listen for payment success message from payment window
  useEffect(() => {
    // Handler for receiving messages from payment success window
    const handlePaymentMessage = async (event: MessageEvent) => {
      // Verify message type and data
      if (
        event.data && 
        typeof event.data === 'object' && 
        event.data.type === 'PAYMENT_COMPLETE' &&
        event.data.walletAddress
      ) {
        console.log('Received payment complete message:', event.data);
        
        try {
          // Show loading message first
          const loadingMsgId = generateMessageId();
          setMessages(prev => [...prev, {
            role: "assistant",
            content: "<div class='flex items-center gap-2'><span>Processing your SOL purchase</span><span class='animate-pulse'>...</span><div class='ml-2 h-4 w-4 animate-spin rounded-full border-2 border-solid border-brand-purple border-t-transparent'></div></div>",
            messageId: loadingMsgId
          }]);
          
          // Ensure we have a wallet address, prefer the one from the event if available
          const targetWalletAddress = walletAddress || event.data.walletAddress;
          
          if (!targetWalletAddress) {
            throw new Error("No wallet address available for transfer");
          }
          
          console.log('Using wallet address for transfer:', targetWalletAddress);
          
          // Call our new transfer-sol API endpoint
          const transferResponse = await fetch(`${config.apiUrl}/api/transfer-sol`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              walletAddress: targetWalletAddress,
              amount: 0.1 // Default SOL amount to transfer
            }),
          });
          
          const transferResult = await transferResponse.json();
          
          if (transferResponse.ok && transferResult.status === 'success') {
            // Update loading message with success and transaction details
            setMessages(prev => prev.map(msg =>
              msg.messageId === loadingMsgId
                ? { 
                    ...msg, 
                    content: `SOL successfully sent to your wallet! [View the transaction on Solana Explorer](${transferResult.explorerLink})` 
                  }
                : msg
            ));
            
            // Fetch balance directly from Solana cluster
            try {
              const connection = new Connection(clusterApiUrl('devnet'));
              const balance = await connection.getBalance(new PublicKey(targetWalletAddress));
              const solBalance = balance / 1000000000; // Convert lamports to SOL
              
              // Show balance info message
              setMessages(prev => [...prev, {
                role: "assistant",
                content: `Your wallet now contains ${solBalance.toFixed(9)} SOL.`,
                messageId: generateMessageId()
              }]);
            } catch (balanceError) {
              console.error('Error fetching wallet balance:', balanceError);
            }
            
            // Offer passive income options for SOL after purchase
            setTimeout(() => {
              handlePassiveIncomePrompt("SOL");
            }, 1000);
          } else {
            // Show error message
            setMessages(prev => prev.map(msg =>
              msg.messageId === loadingMsgId
                ? { 
                    ...msg, 
                    content: `There was an error with your SOL transfer: ${transferResult.error || 'Unknown error'}` 
                  }
                : msg
            ));
          }
        } catch (error) {
          console.error('Error processing SOL transfer:', error);
          setMessages(prev => [...prev, {
            role: "assistant",
            content: `Error processing your SOL purchase: ${error instanceof Error ? error.message : 'Unknown error'}`,
            messageId: generateMessageId()
          }]);
        }
      }
    };
    
    // Add event listener for messages from payment success page
    window.addEventListener('message', handlePaymentMessage);
    
    // Clean up the event listener
    return () => {
      window.removeEventListener('message', handlePaymentMessage);
    };
  }, [walletAddress, setMessages, generateMessageId, handlePassiveIncomePrompt]);

  // Update the effect to handle URL parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const status = searchParams.get('status');
    const sessionId = searchParams.get('session_id');

    if (status === 'success' && sessionId) {
      // Show initial message about successful payment
      const loadingMsgId = generateMessageId();
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Your SOL purchase was successful! Processing your transaction...",
        messageId: loadingMsgId
      }]);

      // Clean up the URL
      window.history.replaceState({}, '', '/chat');

      // Transfer SOL directly instead of checking payment status
      const processDirectTransfer = async () => {
        try {
          // Ensure we have a wallet address
          if (!walletAddress && !publicKey) {
            throw new Error("No wallet address available for transfer");
          }
          
          // Use wallet address from state
          const targetWalletAddress = walletAddress || (publicKey ? publicKey.toString() : null);
          
          if (!targetWalletAddress) {
            throw new Error("No wallet address available for transfer");
          }
          
          console.log('Using wallet address for direct transfer:', targetWalletAddress);
          
          // Call our transfer-sol API endpoint
          const transferResponse = await fetch(`${config.apiUrl}/api/transfer-sol`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              walletAddress: targetWalletAddress,
              amount: 0.1 // Default SOL amount to transfer
            }),
          });
          
          const transferResult = await transferResponse.json();
          
          if (transferResponse.ok && transferResult.status === 'success') {
            // Update the loading message with success and explorer link
            setMessages(prev => prev.map(msg =>
              msg.messageId === loadingMsgId
                ? { 
                    ...msg, 
                    content: `SOL successfully sent to your wallet! [View the transaction on Solana Explorer](${transferResult.explorerLink})` 
                  }
                : msg
            ));
            
            // Fetch balance directly from Solana cluster
            try {
              const connection = new Connection(clusterApiUrl('devnet'));
              const balance = await connection.getBalance(new PublicKey(targetWalletAddress));
              const solBalance = balance / 1000000000; // Convert lamports to SOL
              
              // Show balance info message
              setMessages(prev => [...prev, {
                role: "assistant",
                content: `Your wallet now contains ${solBalance.toFixed(9)} SOL.`,
                messageId: generateMessageId()
              }]);
            } catch (balanceError) {
              console.error('Error fetching wallet balance:', balanceError);
            }
            
            // Offer passive income options for SOL after purchase
            setTimeout(() => {
              handlePassiveIncomePrompt("SOL");
            }, 1000);
          } else {
            // Update loading message with error
            setMessages(prev => prev.map(msg =>
              msg.messageId === loadingMsgId
                ? { 
                    ...msg, 
                    content: `There was an error with your SOL transfer: ${transferResult.error || 'Unknown error'}` 
                  }
                : msg
            ));
          }
        } catch (error) {
          console.error('Error with direct SOL transfer:', error);
          setMessages(prev => prev.map(msg =>
            msg.messageId === loadingMsgId
              ? { 
                  ...msg, 
                  content: `Error processing your SOL purchase: ${error instanceof Error ? error.message : 'Unknown error'}` 
                }
              : msg
          ));
        }
      };

      // Start the direct transfer process
      processDirectTransfer();

    } else if (status === 'success') {
      // Fallback for success without session ID
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Your SOL purchase was successful! Processing your transaction...",
        messageId: generateMessageId()
      }]);
      handleSuccess();

      // Clean up the URL
      window.history.replaceState({}, '', '/chat');

      // Process direct transfer for this case as well
      const processDirectTransferFallback = async () => {
        try {
          // Ensure we have a wallet address
          if (!walletAddress && !publicKey) {
            throw new Error("No wallet address available for transfer");
          }
          
          // Use wallet address from state
          const targetWalletAddress = walletAddress || (publicKey ? publicKey.toString() : null);
          
          if (!targetWalletAddress) {
            throw new Error("No wallet address available for transfer");
          }
          
          // Call our transfer-sol API endpoint
          const transferResponse = await fetch(`${config.apiUrl}/api/transfer-sol`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              walletAddress: targetWalletAddress,
              amount: 0.1 // Default SOL amount to transfer
            }),
          });
          
          const transferResult = await transferResponse.json();
          
          if (transferResponse.ok && transferResult.status === 'success') {
            // Show success message
            setMessages(prev => [...prev, {
              role: "assistant",
              content: `SOL successfully sent to your wallet! [View the transaction on Solana Explorer](${transferResult.explorerLink})`,
              messageId: generateMessageId()
            }]);
            
            // Fetch balance directly from Solana cluster
            try {
              const connection = new Connection(clusterApiUrl('devnet'));
              const balance = await connection.getBalance(new PublicKey(targetWalletAddress));
              const solBalance = balance / 1000000000; // Convert lamports to SOL
              
              // Show balance info message
              setMessages(prev => [...prev, {
                role: "assistant",
                content: `Your wallet now contains ${solBalance.toFixed(9)} SOL.`,
                messageId: generateMessageId()
              }]);
            } catch (balanceError) {
              console.error('Error fetching wallet balance:', balanceError);
            }
            
            // Offer passive income options for SOL after purchase
            setTimeout(() => {
              handlePassiveIncomePrompt("SOL");
            }, 1000);
          } else {
            // Show error message
            setMessages(prev => [...prev, {
              role: "assistant",
              content: `There was an error with your SOL transfer: ${transferResult.error || 'Unknown error'}`,
              messageId: generateMessageId()
            }]);
          }
        } catch (error) {
          console.error('Error with direct SOL transfer (fallback):', error);
          setMessages(prev => [...prev, {
            role: "assistant",
            content: `Error processing your SOL purchase: ${error instanceof Error ? error.message : 'Unknown error'}`,
            messageId: generateMessageId()
          }]);
        }
      };
      
      // Start the fallback direct transfer
      processDirectTransferFallback();
      
    } else if (status === 'cancel') {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Your SOL purchase was cancelled. Would you like to try again?",
        messageId: generateMessageId()
      }]);
      handleCancel();
      // Clean up the URL
      window.history.replaceState({}, '', '/chat');
    }
  }, [handleSuccess, handleCancel, walletAddress, publicKey, setMessages, generateMessageId, handlePassiveIncomePrompt]);

  // Updated effect to handle swap result with proper passive income flow
  useEffect(() => {
    if (swapResult && swapResult.signature) {
      // Check if we've already processed this transaction
      if (processedTransactions.current.has(swapResult.signature)) {
        console.log("Already processed transaction:", swapResult.signature);
        return;
      }

      if (swapResult.status === 'Success') {
        // Add to our processed set to avoid duplicates
        processedTransactions.current.add(swapResult.signature);

        const successMsgId = generateMessageId();
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `Your token swap was successful! Transaction signature: ${swapResult.signature}`,
          messageId: successMsgId
        }]);

        // If this was a token purchase, prompt for passive income options after a short delay
        if (swapQuoteWidget) {
          const tokenSymbol = swapQuoteWidget.outputToken;

          // Clear swap data but keep token info for passive income
          setIsSwapProcessing(false);
          clearSwapResult();
          setSwapQuoteWidget(null);

          // Wait a moment before showing the passive income prompt
          setTimeout(() => {
            handlePassiveIncomePrompt(tokenSymbol);
          }, 1000);
        }
      } else {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `Swap failed: ${swapResult.error || 'Unknown error'}`,
          messageId: generateMessageId()
        }]);
        setIsSwapProcessing(false);
        clearSwapResult();
        setSwapQuoteWidget(null);
      }
    }
  }, [swapResult, clearSwapResult, setMessages, handlePassiveIncomePrompt, setIsSwapProcessing, setSwapQuoteWidget]);

  // Updated effect to clean up passive income state when not needed
  useEffect(() => {
    // Clean up passive income state when no buttons are displayed
    if (passiveIncomeMessageId && !messages.some(msg => 
      msg.messageId === passiveIncomeMessageId && 
      msg.passiveIncomeOptions && 
      msg.passiveIncomeOptions.length > 0
    )) {
      setPassiveIncomeMessageId(null);
      setPassiveIncomeHandlers(null);
    }
  }, [messages, passiveIncomeMessageId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleBuySol = async (amount: number) => {
    if (!publicKey && !isAuthenticated) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Please connect your Solana wallet first to receive your tokens.",
        messageId: generateMessageId()
      }]);
      return;
    }

    try {
      const loadingMsgId = generateMessageId();
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `Opening payment page to purchase 0.1 SOL on Solana Devnet...`,
        messageId: loadingMsgId
      }]);

      // Skip quote fetching and directly proceed to checkout
      await proceedToCheckout();

      // Update the loading message with success message
      setMessages(prev => prev.map(msg =>
        msg.messageId === loadingMsgId
          ? { ...msg, content: `Opening Stripe payment page. Please complete your purchase there. You'll receive 0.1 SOL on Solana Devnet after the payment is processed, and your payment will be automatically refunded.` }
          : msg
      ));
    } catch (error) {
      console.error('Error in handleBuySol:', error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: error instanceof Error
          ? `Error: ${error.message}`
          : "There was an error opening the payment page. Please try again.",
        messageId: generateMessageId()
      }]);
    }
  };

  // Function to handle buying a token with Raydium
  const handleBuyToken = async (amount: number, tokenName: string) => {
    if (!publicKey && !isAuthenticated) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Please connect your Solana wallet first to receive your tokens.",
        messageId: generateMessageId()
      }]);
      return;
    }

    // Find token in the token list
    const token = findToken(tokenName);
    if (!token) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `Sorry, I couldn't find the token "${tokenName}" in our supported tokens list.`,
        messageId: generateMessageId()
      }]);
      return;
    }

    try {
      const loadingMsgId = generateMessageId();
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `Getting quote to buy ${amount} ${token.symbol} with SOL...`,
        messageId: loadingMsgId
      }]);

      // Get order with Raydium SDK
      const order = await getRaydiumOrder(token.address, amount);

      if (raydiumError) {
        // Replace loading message with error
        setMessages(prev => prev.map(msg =>
          msg.messageId === loadingMsgId
            ? { ...msg, content: `Error: ${raydiumError}` }
            : msg
        ));
        return;
      }

      if (!order) {
        // Replace loading message with error if missing transaction
        setMessages(prev => prev.map(msg =>
          msg.messageId === loadingMsgId
            ? { ...msg, content: "Sorry, I couldn't get a valid swap quote. Please try again later." }
            : msg
        ));
        return;
      }

      console.log("Processing order for Raydium swap:", order);

      // Calculate SOL amount from lamports
      const solAmount = Number(order.inAmount) / 1e9;

      // Calculate exchange rate
      const tokenAmount = Number(order.outAmount) / Math.pow(10, token.decimals);
      const exchangeRate = tokenAmount / solAmount;

      // Update the loading message with success and show the quote
      setMessages(prev => prev.map(msg =>
        msg.messageId === loadingMsgId
          ? { ...msg, content: `Found a quote to buy ${amount} ${token.symbol} with SOL!` }
          : msg
      ));

      // Set the quote widget state
      setSwapQuoteWidget({
        requestId: order.requestId,
        inputToken: "SOL",
        inputAmount: solAmount,
        outputToken: token.symbol,
        outputAmount: amount,
        priceImpact: order.priceImpactPct.toFixed(2),
        exchangeRate: exchangeRate
      });
    } catch (error) {
      console.error('Error handling buy token:', error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `Error getting quote: ${error instanceof Error ? error.message : 'Unknown error'}`,
        messageId: generateMessageId()
      }]);
    }
  };

  // Update the handleConfirmSwap function to use Raydium
  const handleConfirmSwap = async () => {
    if (!swapQuoteWidget) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "There was an error with the swap. Please try again.",
        messageId: generateMessageId()
      }]);
      return;
    }

    try {
      setIsSwapProcessing(true);
      const processingMsgId = generateMessageId();

      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Please approve the transaction in your wallet...",
        messageId: processingMsgId
      }]);

      if (!raydiumOrder) {
        throw new Error("Failed to get swap details");
      }

      // Make sure we have a wallet connection
      if (!isAuthenticated && !publicKey) {
        throw new Error("Please connect your wallet to continue");
      }

      // Execute the swap directly with Raydium using executeSwap
      // Update processing message
      setMessages(prev => prev.map(msg =>
        msg.messageId === processingMsgId
          ? { ...msg, content: `Executing swap with Raydium...` }
          : msg
      ));

      // Execute the swap with the stored order data
      const result = await executeSwap();

      if (result) {
        if (result.status === 'Success' && result.signature) {
          // Add to our processed set to avoid duplicates
          processedTransactions.current.add(result.signature);

          // Update processing message with transaction link
          const txSignature = result.signature;
          setMessages(prev => prev.map(msg =>
            msg.messageId === processingMsgId
              // ? { ...msg, content: `Swap successful! [View transaction](https://explorer.solana.com/tx/${txSignature}?cluster=devnet)` }
              ? { ...msg, content: `Swap successful! [View transaction](https://solscan.io/tx/${txSignature}?cluster=devnet)` }
              : msg
          ));

          // Store output token before clearing swap info
          const outputToken = swapQuoteWidget.outputToken;

          // Clear the swap info immediately to prevent duplicate processing
          setIsSwapProcessing(false);
          setSwapQuoteWidget(null);
          clearRaydiumOrder();
          clearSwapResult();

          // Show passive income prompt with a delay
          setTimeout(() => {
            handlePassiveIncomePrompt(outputToken);
          }, 1500);
        } else {
          // Handle error case
          setMessages(prev => prev.map(msg =>
            msg.messageId === processingMsgId
              ? { ...msg, content: `Swap failed: ${result.error || 'Unknown error'}` }
              : msg
          ));
          setIsSwapProcessing(false);
          setSwapQuoteWidget(null);
          clearRaydiumOrder();
          clearSwapResult();
        }
      }
    } catch (error) {
      console.error('Error confirming swap:', error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: error instanceof Error
          ? `Error with swap: ${error.message}`
          : "There was an error executing your swap. Please try again.",
        messageId: generateMessageId()
      }]);
      setIsSwapProcessing(false);
      setSwapQuoteWidget(null);
      clearRaydiumOrder();
      clearSwapResult();
    }
  };

  // Function to handle Raydium swap cancellation
  const handleCancelSwap = () => {
    clearRaydiumOrder();
    setSwapQuoteWidget(null);
    setMessages(prev => [...prev, {
      role: "assistant",
      content: "Swap cancelled. Would you like to try a different amount?",
      messageId: generateMessageId()
    }]);
  };

  const handleConfirmPurchase = async () => {
    try {
      await proceedToCheckout();
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Opening Stripe payment page. Please complete your purchase there. You'll receive 0.1 SOL on Solana Devnet after the payment is processed, and your payment will be automatically refunded.",
        messageId: generateMessageId()
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, there was an error opening the payment page. Please try again.",
        messageId: generateMessageId()
      }]);
    }
  };

  const handleCancelPurchase = () => {
    cancelPurchase();
    setMessages(prev => [...prev, {
      role: "assistant",
      content: "Purchase cancelled. Would you like to try a different amount?",
      messageId: generateMessageId()
    }]);
  };

  const handleLendingAmount = (amount: number, pool: SolendPool) => {
    setLendingAmount(amount);
    setSelectedPool(pool);
    setShowLendingConfirm(true);
  };

  const handleLendNow = async () => {
    // Hide lending options UI immediately when the user clicks "Lend Now"
    setShowLendingConfirm(false);
    setSolendPools(null); // Hide the pools UI immediately

    // Add debugging to see what values we have
    console.log('handleLendNow called with these values:');
    console.log('lendingAmount:', lendingAmount);
    console.log('lendingToken:', lendingToken);
    console.log('selectedPool:', selectedPool);
    console.log('publicKey:', publicKey?.toString());
    console.log('isAuthenticated:', isAuthenticated);
    console.log('walletAddress:', walletAddress);

    // Add a message with loading indicator
    const lendingMsgId = generateMessageId();
    setMessages(prev => [...prev, {
      role: "assistant",
      content: `<div class='flex items-center gap-2'><span>Processing your lending request of ${lendingAmount} ${lendingToken?.symbol} at ${selectedPool?.apy}% APY</span><span class='animate-pulse'>...</span><div class='ml-2 h-4 w-4 animate-spin rounded-full border-2 border-solid border-brand-purple border-t-transparent'></div></div>`,
      messageId: lendingMsgId
    }]);

    try {
      // Check each value individually for better error reporting
      if (!selectedPool) {
        console.error('Missing selectedPool');
        throw new Error('Missing selectedPool - Please select a lending pool');
      }

      if (!publicKey && !walletAddress) {
        console.error('Missing publicKey/walletAddress');
        throw new Error('Missing wallet address - Please connect your wallet');
      }

      if (!lendingAmount || lendingAmount <= 0) {
        console.error('Invalid lendingAmount:', lendingAmount);
        throw new Error('Please enter a valid amount to lend');
      }

      // Use either Privy wallet address or Solana wallet public key
      const userPublicKey = walletAddress || publicKey?.toString();

      // Update the message to inform user to approve the transaction
      setMessages(prev => prev.map(msg =>
        msg.messageId === lendingMsgId
          ? { 
              ...msg, 
              content: `<div class='flex items-center gap-2'><span>Please approve the transaction in your wallet</span><span class='animate-pulse'>...</span><div class='ml-2 h-4 w-4 animate-spin rounded-full border-2 border-solid border-brand-purple border-t-transparent'></div></div>` 
            }
          : msg
      ));

      // Create a callback for sending the transaction based on available wallet
      const sendTx = async (transaction: VersionedTransaction): Promise<string> => {
        const connection = getAlchemyConnection();

        if (isAuthenticated && privySendTransaction) {
          return await privySendTransaction(transaction, connection);
        } else if (connected && publicKey && sendTransaction) {
          return await sendTransaction(transaction, connection);
        } else {
          throw new Error("No wallet available to send transaction");
        }
      };

      // Update the message to show transaction is processing
      setMessages(prev => prev.map(msg =>
        msg.messageId === lendingMsgId
          ? { 
              ...msg, 
              content: `<div class='flex items-center gap-2'><span>Processing your transaction</span><span class='animate-pulse'>...</span><div class='ml-2 h-4 w-4 animate-spin rounded-full border-2 border-solid border-brand-purple border-t-transparent'></div></div>` 
            }
          : msg
      ));

      // Use the extracted service function to handle the lending logic
      const signature = await submitSolendLend(
        selectedPool.pool,
        lendingAmount,
        userPublicKey!,
        sendTx
      );

      // Update the loading message with success and a link to the transaction
      setMessages(prev => prev.map(msg =>
        msg.messageId === lendingMsgId
          ? { 
              ...msg, 
              content: `Successfully lent ${lendingAmount} ${lendingToken?.symbol} on Solend! [View transaction](https://solscan.io/tx/${signature}?cluster=devnet). You are now earning ${selectedPool.apy}% APY.` 
            }
          : msg
      ));
    } catch (e) {
      console.error('Lending error:', e);
      
      // Update the loading message with the error
      setMessages(prev => prev.map(msg =>
        msg.messageId === lendingMsgId
          ? { 
              ...msg, 
              content: `Lending failed: ${e instanceof Error ? e.message : 'Unknown error'}` 
            }
          : msg
      ));
    } finally {
      // Clear all lending-related state
      setLendingAmount(null);
      setSelectedPool(null);
      setSolendPools(null);
      setLendingToken(null);
      setShowLendingConfirm(false);
    }
  };

  const handleQuickAction = (action: string) => {
    setInput(action);
    handleSend();
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput("");
    setMessages(prev => [...prev, {
      role: "user",
      content: userMessage,
      messageId: generateMessageId()
    }]);
    setIsTyping(true);

    try {
      const llmResponse = await processLLMResponse(userMessage);

      // Handle different intents
      switch (llmResponse.intent) {
        case "buy_sol":
          if (llmResponse.amount && llmResponse.amount > 0) {
            await handleBuySol(llmResponse.amount);
          } else {
            setMessages(prev => [...prev, {
              role: "assistant",
              content: "Please specify a valid amount of SOL to buy.",
              messageId: generateMessageId()
            }]);
          }
          break;

        case "buy_token":
          if (llmResponse.amount && llmResponse.amount > 0 && llmResponse.token) {
            await handleBuyToken(llmResponse.amount, llmResponse.token);
          } else {
            setMessages(prev => [...prev, {
              role: "assistant",
              content: "Please specify a valid amount and token to buy.",
              messageId: generateMessageId()
            }]);
          }
          break;

        case "explore_yield": {
          // Try to extract token symbol from user message
          let tokenSymbol = llmResponse.token;
          if (!tokenSymbol) {
            tokenSymbol = extractTokenSymbolFromYieldQuery(userMessage) || undefined;
          }

          if (tokenSymbol) {
            // Find token mint from tokenList
            const token = tokenList.find(t => t.symbol.toUpperCase() === tokenSymbol.toUpperCase());
            if (token) {
              const loadingMsgId = generateMessageId();
              setMessages(prev => [...prev, {
                role: "assistant",
                content: `Looking up yield options for ${token.symbol}...`,
                messageId: loadingMsgId
              }]);

              // Use the showLendingOptions function
              showLendingOptions(token.symbol, token.address);
            } else {
              setMessages(prev => [...prev, {
                role: "assistant",
                content: `Token ${tokenSymbol} not found in supported list.`,
                messageId: generateMessageId()
              }]);
            }
          } else {
            // If no specific token is mentioned, show a list of supported tokens
            setMessages(prev => [...prev, {
              role: "assistant",
              content: "Which token would you like to explore lending options for? Here are the supported tokens:",
              messageId: generateMessageId(),
              options: tokenList.map(token => ({
                platform: token.symbol,
                type: "lend",
                apy: 0,
                riskLevel: "low",
                description: `Explore lending options for ${token.symbol}`,
                url: "",
                tokenSymbol: token.symbol
              }))
            }]);
          }
          break;
        }

        case "view_portfolio":
          // Process message to hide wallet addresses 
          setMessages(prev => [...prev, {
            role: "assistant",
            content: llmResponse.message,
            messageId: generateMessageId()
          }]);
          break;

        default:
          // Always hide wallet addresses in messages
          setMessages(prev => [...prev, {
            role: "assistant",
            content: llmResponse.message,
            messageId: generateMessageId()
          }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "I'm having trouble understanding. Please try again.",
        messageId: generateMessageId()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Handle token exploration for buttons
  const handleExploreYield = (tokenSymbol: string) => {
    const token = findToken(tokenSymbol);
    if (token) {
      showLendingOptions(token.symbol, token.address);
    }
  };

  // Update condition to check both Solana wallet adapter and Privy wallet
  if (!connected && !isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 h-screen w-full bg-gradient-main">
        <div className="text-center">
          <p className="text-foreground mb-4">Please connect your Solana wallet to get started.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden">
      {/* Messages Area - Single scrollable container with padding for input area */}
      <div className="flex-1 overflow-y-auto bg-gradient-main">
        <div className="w-full p-4 space-y-4 pb-36">
          {messages.map((message, index) => (
            <ChatMessage
              key={message.messageId || index}
              message={message}
              passiveIncomeMessageId={passiveIncomeMessageId}
              passiveIncomeHandlers={passiveIncomeHandlers}
              onExploreYield={handleExploreYield}
            />
          ))}

          {currentQuote && (
            <div className="flex justify-start">
              <div className="w-full max-w-[700px]">
                <QuoteWidget
                  quote={currentQuote}
                  onConfirm={handleConfirmPurchase}
                  onCancel={handleCancelPurchase}
                />
              </div>
            </div>
          )}

          {swapQuoteWidget && (
            <div className="flex justify-start">
              <div className="w-full max-w-[700px]">
                <SwapWidget
                  quote={swapQuoteWidget}
                  onConfirm={handleConfirmSwap}
                  onCancel={handleCancelSwap}
                  isProcessing={isSwapProcessing}
                />
              </div>
            </div>
          )}

          {solendPools && !showLendingConfirm && (
            <div className="flex justify-start w-full">
              <SolendPoolsWidget
                pools={solendPools}
                tokenSymbol={lendingToken?.symbol || ''}
                onSelectPool={(pool) => {
                  setLendingAmount(null);
                  setSelectedPool(pool);
                  setShowLendingConfirm(true);
                }}
              />
            </div>
          )}

          {showLendingConfirm && selectedPool && (
            <LendingConfirmWidget
              tokenSymbol={lendingToken?.symbol || ''}
              pool={selectedPool}
              amount={lendingAmount}
              onAmountChange={setLendingAmount}
              onConfirm={handleLendNow}
              onCancel={() => setShowLendingConfirm(false)}
            />
          )}

          {isTyping && (
            <div className="flex justify-start">
              <div className="typing-indicator rounded-lg p-3">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-brand-purple rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-brand-purple rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-brand-purple rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>  
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area and Quick Actions - Fixed at bottom */}
      <div className="fixed bottom-0 left-64 right-0 bg-white border-t border-brand-purple/20 shadow-lg">
        <div className="w-full">
          <ChatInputArea
            input={input}
            onInputChange={setInput}
            onSend={handleSend}
            onQuickAction={handleQuickAction}
          />
        </div>
      </div>
    </div>
  )
} 
