"use client"
import { useRef, useEffect } from "react"
import { VersionedTransaction } from "@solana/web3.js"
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

export function ChatInterface() {
  // Use the custom hooks to manage state
  const {
    messages,
    setMessages,
    input,
    setInput,
    isTyping,
    setIsTyping
  } = useChatState();

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

  const {
    isLoading: isLoadingSwap,
    orderResponse: jupiterOrder,
    swapResult,
    error: jupiterError,
    getOrder: getJupiterOrder,
    executeSwap,
    clearOrder: clearJupiterOrder,
    clearResult: clearSwapResult,
    swapQuoteWidget,
    setSwapQuoteWidget,
    isSwapProcessing,
    setIsSwapProcessing
  } = useJupiterState();

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
              options: [
                { platform: "Sure", type: "lend", apy: 0, riskLevel: "low", description: "Show safe lending options", url: "", tokenSymbol: token.symbol },
                { platform: "I'm okay, thanks", type: "lend", apy: 0, riskLevel: "low", description: "Decline lending options", url: "", tokenSymbol: token.symbol }
              ]
            }
          : msg
      ));
    });
  };

  // Update the effect to handle URL parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const status = searchParams.get('status');
    
    if (status === 'success') {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Your SOL purchase was successful! The tokens will be sent to your wallet on Solana Devnet shortly. You can check your wallet balance in a few minutes.",
        messageId: generateMessageId()
      }]);
      handleSuccess();
      
      // Offer passive income options for SOL after purchase
      setTimeout(() => {
        handlePassiveIncomePrompt("SOL");
      }, 1000);
      
      // Clean up the URL
      window.history.replaceState({}, '', '/chat');
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
  }, [handleSuccess, handleCancel]);

  // Updated effect to handle swap result with proper passive income flow
  useEffect(() => {
    if (swapResult) {
      if (swapResult.status === 'Success') {
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
  }, [swapResult, clearSwapResult]);

  // Updated effect to clean up passive income state when not needed
  useEffect(() => {
    // Clean up passive income state when no buttons are displayed
    if (!messages.some(msg => msg.messageId === passiveIncomeMessageId)) {
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

  // Function to handle buying a token with Jupiter
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

      // Get order directly with transaction included
      const order = await getJupiterOrder(token.address, amount);
      
      if (jupiterError) {
        // Replace loading message with error
        setMessages(prev => prev.map(msg => 
          msg.messageId === loadingMsgId 
            ? { ...msg, content: `Error: ${jupiterError}` }
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

      console.log("Processing order for Jupiter swap:", order);

      try {
        // Get input and output amounts from the order
        const inAmountNumber = parseFloat(order.inAmount) / Math.pow(10, 9); // SOL is always 9 decimals
        const outAmountNumber = parseFloat(order.outAmount) / Math.pow(10, token.decimals);
        
        // Calculate exchange rate
        const exchangeRate = outAmountNumber / inAmountNumber;

        // Create quote widget data
        const quoteWidget = {
          requestId: order.requestId,
          inputToken: "SOL",
          inputAmount: inAmountNumber,
          outputToken: token.symbol,
          outputAmount: outAmountNumber,
          priceImpact: order.priceImpactPct,
          exchangeRate: exchangeRate
        };

        console.log("Created swap quote widget:", quoteWidget);
        setSwapQuoteWidget(quoteWidget);

        // Replace loading message with quote info
        setMessages(prev => prev.map(msg => 
          msg.messageId === loadingMsgId 
            ? { ...msg, content: `I've found a swap quote to buy ${amount} ${token.symbol}. Would you like to proceed?` }
            : msg
        ));
      } catch (error) {
        console.error("Error processing order data:", error);
        setMessages(prev => prev.map(msg => 
          msg.messageId === loadingMsgId 
            ? { ...msg, content: "Sorry, there was an error processing the swap quote. Please try again." }
            : msg
        ));
      }
    } catch (error) {
      console.error('Error in handleBuyToken:', error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: error instanceof Error 
          ? `Error: ${error.message}`
          : "I'm having trouble processing your token swap request. Please try again.",
        messageId: generateMessageId()
      }]);
    }
  };

  // Update the handleConfirmSwap function to use the helper
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

      if (!jupiterOrder || !jupiterOrder.transaction) {
        throw new Error("Failed to get transaction details");
      }
      
      // Use the helper function to get the connection
      const connection = getAlchemyConnection();
      
      // Deserialize the transaction from Jupiter
      const transaction = VersionedTransaction.deserialize(
        Buffer.from(jupiterOrder.transaction, 'base64')
      );
      
      // Sign the transaction and serialize it (each wallet type handles this differently)
      let signature;
      let signedTransaction;
      
      if (isAuthenticated && walletAddress && privySendTransaction) {
        console.log("Using Privy wallet for transaction");
        try {
          // For Privy wallet, we need to:
          // 1. Sign and send the transaction
          // 2. Get the serialized signed transaction
          
          // This is a workaround since Privy doesn't expose a way to just sign
          // We sign and send first to get user approval but use the serialized transaction for Jupiter
          signature = await privySendTransaction(transaction, connection);
          
          // We can't directly get the signed transaction from Privy
          // For now, update the user that we're preparing the transaction for Jupiter
          setMessages(prev => prev.map(msg => 
            msg.messageId === processingMsgId 
              ? { ...msg, content: `Transaction approved! Preparing for execution...` }
              : msg
          ));
          
          // We need to retrieve the transaction to get the serialized version
          // Use the Alchemy connection here too to avoid 403 errors
          const confirmedTx = await getAlchemyConnection().getTransaction(signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0
          });
          
          if (!confirmedTx || !confirmedTx.transaction) {
            throw new Error("Failed to retrieve the signed transaction");
          }
          
          // Use any type to bypass type checking errors with serialize method
          signedTransaction = Buffer.from((confirmedTx.transaction as any).serialize()).toString('base64');
        } catch (err) {
          console.error("Privy sendTransaction error:", err);
          throw new Error(`Privy wallet error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      } else if (connected && publicKey && signTransaction) {
        // If signTransaction is available, use it directly for better UX
        console.log("Using Solana wallet adapter's signTransaction method");
        try {
          // Cast to any to bypass the type checking errors
          const signedTx = await signTransaction(transaction);
          
          // Use a more generic approach to serialize
          signedTransaction = Buffer.from((signedTx as any).serialize()).toString('base64');
          
          // Update the message that transaction was signed
          setMessages(prev => prev.map(msg => 
            msg.messageId === processingMsgId 
              ? { ...msg, content: `Transaction signed! Preparing for execution...` }
              : msg
          ));
        } catch (err) {
          console.error("Solana wallet signTransaction error:", err);
          throw new Error(`Wallet error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      } else if (connected && publicKey && sendTransaction) {
        console.log("Using Solana wallet adapter's sendTransaction method");
        try {
          // When using Solana wallet adapter, we can:
          // 1. Sign the transaction (if the adapter supports it)
          // 2. Serialize it and send to Jupiter
          
          // First sign and get signature
          signature = await sendTransaction(transaction, connection);
          
          // Update the message that we got signature
          setMessages(prev => prev.map(msg => 
            msg.messageId === processingMsgId 
              ? { ...msg, content: `Transaction approved! Preparing for execution...` }
              : msg
          ));
          
          // We need to retrieve the transaction to get the serialized version
          // Use the Alchemy connection here too to avoid 403 errors
          const confirmedTx = await getAlchemyConnection().getTransaction(signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0
          });
          
          if (!confirmedTx || !confirmedTx.transaction) {
            throw new Error("Failed to retrieve the signed transaction");
          }
          
          // Use any type to bypass type checking errors with serialize method
          signedTransaction = Buffer.from((confirmedTx.transaction as any).serialize()).toString('base64');
        } catch (err) {
          console.error("Solana wallet adapter error:", err);
          throw new Error(`Wallet error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      } else {
        throw new Error("No wallet is available to sign the transaction");
      }
      
      if (!signedTransaction) {
        throw new Error("Failed to get signed transaction");
      }
      
      // Update processing message
      setMessages(prev => prev.map(msg => 
        msg.messageId === processingMsgId 
          ? { ...msg, content: `Transaction signed! Executing swap with Jupiter...` }
          : msg
      ));
      
      // Execute the order with the signed transaction
      const result = await executeSwap(signedTransaction);
      
      if (result) {
        if (result.status === 'Success') {
          // Update with success message using the signature from the result
          const txSignature = result.signature || signature;
          setMessages(prev => prev.map(msg => 
            msg.messageId === processingMsgId 
                ? { ...msg, content: `Swap successful! [View transaction](https://explorer.solana.com/tx/${txSignature}?cluster=mainnet-beta)` }
              : msg
          ));
          
          // Store output token before clearing swap info
          const outputToken = swapQuoteWidget.outputToken;
          
          // Clear the swap info
          setIsSwapProcessing(false);
          setSwapQuoteWidget(null);
          clearJupiterOrder();
          
          // Prompt for passive income directly after clearing swap info
          // with a slight delay for better UX
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
          clearJupiterOrder();
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
      clearJupiterOrder();
    }
  };

  // Function to handle Jupiter swap cancellation
  const handleCancelSwap = () => {
    clearJupiterOrder();
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
    
    setMessages(prev => [...prev, {
      role: "assistant",
      content: `Lending ${lendingAmount} ${lendingToken?.symbol} at ${selectedPool?.apy}% APY... Please approve the transaction in your wallet.`,
      messageId: generateMessageId()
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
      
      // Use the extracted service function to handle the lending logic
      const signature = await submitSolendLend(
        selectedPool.pool,
        lendingAmount,
        userPublicKey!,
        sendTx
      );

      setMessages(prev => [...prev, {
        role: "assistant",
        content: `Successfully lent ${lendingAmount} ${lendingToken?.symbol} on Solend! Transaction signature: ${signature}. You are now earning ${selectedPool.apy}% APY.`,
        messageId: generateMessageId()
      }]);
    } catch (e) {
      console.error('Lending error:', e);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `Lending failed: ${e instanceof Error ? e.message : 'Unknown error'}`,
        messageId: generateMessageId()
      }]);
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
          // TODO: Implement portfolio view logic
          setMessages(prev => [...prev, {
            role: "assistant",
            content: llmResponse.message,
            messageId: generateMessageId()
          }]);
          break;

        default:
          setMessages(prev => [...prev, {
            role: "assistant",
            content: llmResponse.message,
            messageId: generateMessageId()
          }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "I'm having trouble understanding. Please try again or use the buttons below.",
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
      <div className="flex-1 flex items-center justify-center p-4 h-screen w-full">
        <div className="text-center">
          <p className="text-white mb-4">Please connect your Solana wallet to get started.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen w-full pl-64">
      {/* Messages Area - Made scrollable with fixed height */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-36">
        <div className="w-full">
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
              <div className="bg-[#252C3B] rounded-lg p-3">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-[#34C759] rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-[#34C759] rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-[#34C759] rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area and Quick Actions - Fixed at bottom */}
      <div className="fixed bottom-0 left-64 right-0 bg-[#0D1117] border-t border-gray-700 shadow-lg">
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
