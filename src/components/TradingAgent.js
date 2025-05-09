'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import agentService from '../services/AgentService';
import jupiterService from '../services/JupiterService';

export default function TradingAgent() {
  const { publicKey, signTransaction } = useWallet();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingTrade, setPendingTrade] = useState(null);
  const [quote, setQuote] = useState(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [awaitingInputToken, setAwaitingInputToken] = useState(false);
  const [lastTradeRequest, setLastTradeRequest] = useState(null);
  const [lastTransaction, setLastTransaction] = useState(null);
  const [swapMode, setSwapMode] = useState('ExactIn'); // Default to ExactIn
  
  // Add ref for the chat container
  const chatContainerRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, lastTransaction, quote]);

  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim() || !publicKey) return;

    setIsProcessing(true);
    const userMessage = inputMessage;
    setInputMessage('');
    
    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      // Check if user is specifying an amount for input or output
      const amountMatch = userMessage.match(/(\d+(?:\.\d+)?)\s*(SOL|USDC|USDT|BONK|TRUMP)/i);
      if (amountMatch) {
        const amount = parseFloat(amountMatch[1]);
        const token = amountMatch[2].toUpperCase();
        
        // Use LLM to detect if this is input or output amount
        const response = await agentService.processUserRequest(userMessage, publicKey.toString());
        
        // Extract swap mode from LLM response
        const swapMode = response.details?.swapMode || 'ExactIn';
        setSwapMode(swapMode);
        
        // Process the trade with detected mode
        setPendingTrade({
          amount,
          token,
          swapMode,
          inputToken: swapMode === 'ExactIn' ? token : 'USDC', // Default to USDC as the other token
          intent: swapMode === 'ExactIn' ? 'spend' : 'receive'
        });
        
        // Fetch quote with detected mode
        setIsLoadingQuote(true);
        try {
          const quote = await jupiterService.getQuote(
            swapMode === 'ExactIn' ? token : 'USDC',
            swapMode === 'ExactIn' ? 'USDC' : token,
            amount,
            swapMode
          );
          setQuote(quote);
        } catch (error) {
          console.error('Error fetching quote:', error);
          setMessages(prev => [...prev, { 
            role: 'agent', 
            content: `Failed to fetch quote: ${error.message}` 
          }]);
        } finally {
          setIsLoadingQuote(false);
        }
        return;
      }

      const response = await agentService.processUserRequest(userMessage, publicKey.toString());

      // Add agent response to chat
      setMessages(prev => [...prev, { role: 'agent', content: response.message }]);

      // If there's a transaction, store it and show the Solscan link
      if (response.details?.explorerUrl) {
        setLastTransaction(response.details);
        setMessages(prev => [...prev, { 
          role: 'agent', 
          content: `Transaction successful! View it on Solscan: ${response.details.explorerUrl}` 
        }]);
      }

      if (response.type === 'trade') {
        // If input token is not specified, ask for it
        if (!response.inputToken) {
          setLastTradeRequest(response);
          setAwaitingInputToken(true);
          setMessages(prev => [...prev, { 
            role: 'agent', 
            content: 'Which token would you like to use for this trade? (e.g., SOL, USDC, etc.)' 
          }]);
        } else {
          setPendingTrade(response);
          // Fetch quote when trade is detected
          setIsLoadingQuote(true);
          try {
            const quote = await jupiterService.getQuote(
              response.inputToken,
              response.token,
              response.amount,
              response.swapMode
            );
            setQuote(quote);
          } catch (error) {
            console.error('Error fetching quote:', error);
            setMessages(prev => [...prev, { 
              role: 'agent', 
              content: `Failed to fetch quote: ${error.message}` 
            }]);
          } finally {
            setIsLoadingQuote(false);
          }
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
      setMessages(prev => [...prev, { 
        role: 'agent', 
        content: `Error: ${error.message}` 
      }]);
    } finally {
      setIsProcessing(false);
    }
  }, [inputMessage, publicKey]);

  const handleInputTokenResponse = useCallback(async (token) => {
    if (!lastTradeRequest) return;

    try {
      // If we're waiting for input/output confirmation
      if (typeof lastTradeRequest.amount === 'number') {
        const isInput = token.toLowerCase() === 'input';
        setSwapMode(isInput ? 'ExactIn' : 'ExactOut');
        
        // Process the trade with the specified mode
        setPendingTrade({
          ...lastTradeRequest,
          swapMode: isInput ? 'ExactIn' : 'ExactOut'
        });
        
        // Fetch quote with the specified mode
        setIsLoadingQuote(true);
        try {
          const quote = await jupiterService.getQuote(
            isInput ? lastTradeRequest.token : 'USDC', // Default to USDC as the other token
            isInput ? 'USDC' : lastTradeRequest.token,
            lastTradeRequest.amount,
            isInput ? 'ExactIn' : 'ExactOut'
          );
          setQuote(quote);
        } catch (error) {
          console.error('Error fetching quote:', error);
          setMessages(prev => [...prev, { 
            role: 'agent', 
            content: `Failed to fetch quote: ${error.message}` 
          }]);
        } finally {
          setIsLoadingQuote(false);
        }
        setAwaitingInputToken(false);
        return;
      }

      // Update the trade request with the input token
      const updatedTradeRequest = {
        ...lastTradeRequest,
        inputToken: token
      };
      
      setPendingTrade(updatedTradeRequest);
      setAwaitingInputToken(false);
      
      // Fetch quote with the specified input token
      setIsLoadingQuote(true);
      try {
        const quote = await jupiterService.getQuote(
          token,
          updatedTradeRequest.token,
          updatedTradeRequest.amount
        );
        setQuote(quote);
      } catch (error) {
        console.error('Error fetching quote:', error);
        setMessages(prev => [...prev, { 
          role: 'error', 
          content: `Failed to fetch quote: ${error.message}` 
        }]);
      } finally {
        setIsLoadingQuote(false);
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'error', 
        content: `Invalid token: ${token}. Please provide a valid token symbol.` 
      }]);
    }
  }, [lastTradeRequest]);

  const handleConfirmTrade = useCallback(async () => {
    if (!pendingTrade || !quote) return;

    try {
      setIsProcessing(true);
      setMessages(prev => [...prev, { 
        role: 'agent', 
        content: 'Executing trade...' 
      }]);

      const result = await jupiterService.swap(
        pendingTrade.inputToken,
        pendingTrade.token,
        pendingTrade.amount,
        pendingTrade.swapMode
      );

      if (result.status === 'success') {
        setLastTransaction(result.details);
        setMessages(prev => [...prev, { 
          role: 'agent', 
          content: `Trade executed successfully! View it on Solscan: ${result.details.explorerUrl}` 
        }]);
      } else {
        throw new Error(result.message || 'Trade execution failed');
      }
    } catch (error) {
      console.error('Trade error:', error);
      setMessages(prev => [...prev, { 
        role: 'error', 
        content: `Failed to execute trade: ${error.message}` 
      }]);
    } finally {
      setIsProcessing(false);
      setPendingTrade(null);
      setQuote(null);
      setLastTradeRequest(null);
    }
  }, [pendingTrade, quote]);

  const formatAmount = (amount, decimals) => {
    return (amount / Math.pow(10, decimals)).toFixed(decimals);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">

      {/* Chat Area */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
      >
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl p-4 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-800 shadow-sm'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.role === 'agent' && message.content.includes('Solscan') && (
                <a
                  href={message.content.split('Solscan: ')[1]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-blue-600 hover:text-blue-800 underline"
                >
                  View on Solscan
                </a>
              )}
            </div>
          </div>
        ))}

        {/* Transaction Success Card */}
        {lastTransaction && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-green-800 font-medium">Transaction Successful!</h3>
                <p className="text-sm text-green-600">
                  {lastTransaction.fromToken} → {lastTransaction.toToken}
                </p>
              </div>
              <a
                href={lastTransaction.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                View on Solscan
              </a>
            </div>
          </div>
        )}

        {/* Trade Confirmation */}
        {pendingTrade && (
          <div className="border-t border-gray-200 p-4 bg-blue-50">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-blue-800">Confirm {pendingTrade.intent} order</p>
                  <p className="text-sm text-blue-600">
                    {pendingTrade.amount} {pendingTrade.inputToken} → {pendingTrade.token}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setPendingTrade(null);
                      setQuote(null);
                      setLastTradeRequest(null);
                    }}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmTrade}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Confirm
                  </button>
                </div>
              </div>

              {/* Quote Details */}
              {isLoadingQuote ? (
                <div className="flex items-center justify-center py-4">
                  <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="ml-2 text-blue-600">Fetching quote...</span>
                </div>
              ) : quote ? (
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Input Amount</p>
                      <p className="font-medium">{formatAmount(quote.inputAmount, quote.inputToken.decimals)} {quote.inputToken.symbol}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Output Amount</p>
                      <p className="font-medium">{formatAmount(quote.outputAmount, quote.outputToken.decimals)} {quote.outputToken.symbol}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Price Impact</p>
                      <p className="font-medium">{quote.priceImpact.toFixed(2)}%</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Slippage</p>
                      <p className="font-medium">{quote.slippage}%</p>
                    </div>
                  </div>
                  <div className="mt-4 text-xs text-gray-500">
                    <p>Note: This is a demo. No actual trades will be executed.</p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                if (awaitingInputToken) {
                  handleInputTokenResponse(e.target.value);
                  setInputMessage('');
                } else {
                  handleSendMessage();
                }
              }
            }}
            placeholder={awaitingInputToken ? "Enter token symbol (e.g., SOL, USDC)" : "Type your message..."}
            className="flex-1 p-3 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            disabled={isProcessing}
          />
          <button
            onClick={() => {
              if (awaitingInputToken) {
                handleInputTokenResponse(inputMessage);
                setInputMessage('');
              } else {
                handleSendMessage();
              }
            }}
            disabled={isProcessing}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              'Send'
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 