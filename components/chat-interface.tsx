"use client"

import { useState, useRef, useEffect } from "react"
import { Send, ArrowRight, Check, X } from "lucide-react"
import { useWallet } from "@solana/wallet-adapter-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useOnramp } from '@/hooks/useOnramp'

interface Message {
  role: "user" | "assistant"
  content: string
  options?: Array<{
    platform: string
    type: 'stake' | 'lend' | 'liquidity' | 'buy'
    apy: number
    riskLevel: "low" | "medium" | "high"
    description: string
    url: string
    tokenSymbol: string
    tvl?: number
    protocolFee?: number
    withdrawalFee?: number
    additionalRewards?: {
      token: string
      apy: number
    }[]
  }>
}

interface LLMResponse {
  intent: "buy_sol" | "explore_yield" | "view_portfolio" | "out_of_scope"
  amount?: number | null
  currency?: "SOL"
  message: string
}

// Add new interface for onramp quote
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

const SYSTEM_PROMPT = `You are a financial assistant for a Solana-based Trading/Yield Agent. Your role is to parse user inputs and identify one of the following intents: buy SOL, explore yield options, view portfolio, or out-of-scope.

For buy SOL requests, parse the amount and currency. Examples:
- "I want to buy 1 SOL" -> { "intent": "buy_sol", "amount": 1, "currency": "SOL" }
- "Buy 0.5 SOL" -> { "intent": "buy_sol", "amount": 0.5, "currency": "SOL" }
- "Purchase 2 SOL" -> { "intent": "buy_sol", "amount": 2, "currency": "SOL" }

For each response, return a structured JSON with:
{
  "intent": "buy_sol" | "explore_yield" | "view_portfolio" | "out_of_scope",
  "amount": number | null,  // Required for buy_sol intent
  "currency": "SOL",       // Required for buy_sol intent
  "message": string        // User-friendly response
}

Keep all responses concise (under 100 characters) and conversational.`;

interface QuoteWidgetProps {
  quote: OnrampQuote;
  onConfirm: () => void;
  onCancel: () => void;
}

function QuoteWidget({ quote, onConfirm, onCancel }: QuoteWidgetProps) {
  return (
    <div className="bg-[#1E2533] rounded-lg p-4 border border-[#34C759] mt-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">MoonPay Purchase</h3>
        <span className="text-[#34C759] text-lg font-bold">
          {quote.outputAmount} {quote.outputCurrency}
        </span>
      </div>
      
      <div className="space-y-2 text-sm text-gray-400">
        <div className="flex justify-between">
          <span>You Pay:</span>
          <span className="text-white">${quote.inputAmount} {quote.inputCurrency}</span>
        </div>
        <div className="flex justify-between">
          <span>You Receive:</span>
          <span className="text-white">{quote.outputAmount} {quote.outputCurrency}</span>
        </div>
        <div className="flex justify-between">
          <span>Provider Fee:</span>
          <span className="text-white">${quote.fees.provider.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Network Fee:</span>
          <span className="text-white">${quote.fees.network.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Total Fees:</span>
          <span className="text-white">${quote.fees.total.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Exchange Rate:</span>
          <span className="text-white">1 {quote.inputCurrency} = {quote.exchangeRate} {quote.outputCurrency}</span>
        </div>
        <div className="flex justify-between">
          <span>Network:</span>
          <span className="text-white">Solana Devnet</span>
        </div>
        <div className="flex justify-between">
          <span>Processing Time:</span>
          <span className="text-white">{quote.estimatedProcessingTime}</span>
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        <Button
          onClick={onConfirm}
          className="flex-1 bg-[#34C759] hover:bg-[#2FB350] text-white"
        >
          <Check className="h-4 w-4 mr-2" />
          Proceed to Payment
        </Button>
        <Button
          onClick={onCancel}
          variant="outline"
          className="flex-1 border-[#34C759] text-[#34C759] hover:bg-[#34C759] hover:text-white"
        >
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I can help you buy SOL, explore yield options, or check your portfolio. What would you like to do?"
    }
  ])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { connected, publicKey } = useWallet()
  const { 
    isProcessing: isProcessingBuy, 
    currentQuote, 
    error: onrampError,
    getQuote,
    confirmPurchase,
    cancelPurchase,
    handleSuccess,
    handleCancel
  } = useOnramp()

  // Add useEffect to handle URL parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const status = searchParams.get('status');
    
    if (status === 'success') {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Your SOL purchase was successful! The tokens will be sent to your wallet on Solana Devnet shortly. You can check your wallet balance in a few minutes."
      }]);
      handleSuccess();
      // Clean up the URL
      window.history.replaceState({}, '', '/chat');
    } else if (status === 'cancel') {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Your SOL purchase was cancelled. Would you like to try again?"
      }]);
      handleCancel();
      // Clean up the URL
      window.history.replaceState({}, '', '/chat');
    }
  }, [handleSuccess, handleCancel]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const processLLMResponse = async (userMessage: string): Promise<LLMResponse> => {
    const apiKey = process.env.NEXT_PUBLIC_TOGETHER_API_KEY;
    
    if (!apiKey) {
      console.error('Together AI API key is not configured');
      return {
        intent: "out_of_scope",
        message: "The AI service is not properly configured. Please check your environment settings."
      };
    }

    try {
      const response = await fetch('https://api.together.xyz/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userMessage }
          ],
          temperature: 0.1,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.error('Invalid Together AI API key');
          return {
            intent: "out_of_scope",
            message: "The AI service is not properly configured. Please check your API key."
          };
        }
        throw new Error(`Together AI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      try {
        // Try to parse as JSON first
        const parsedResponse = JSON.parse(content);
        if (!parsedResponse.intent || !parsedResponse.message) {
          throw new Error('Invalid response format');
        }
        return parsedResponse;
      } catch (e) {
        // If JSON parsing fails, analyze the text response
        console.log('LLM returned non-JSON response:', content);
        
        // Check if the response contains a buy request
        const buyMatch = content.match(/buy\s+(\d+(?:\.\d+)?)\s*sol/i);
        if (buyMatch) {
          const amount = parseFloat(buyMatch[1]);
          return {
            intent: "buy_sol",
            amount: amount,
            currency: "SOL",
            message: content
          };
        }

        // Check for other intents
        if (content.toLowerCase().includes('yield') || content.toLowerCase().includes('earn')) {
          return {
            intent: "explore_yield",
            message: content
          };
        }

        if (content.toLowerCase().includes('portfolio') || content.toLowerCase().includes('balance')) {
          return {
            intent: "view_portfolio",
            message: content
          };
        }

        // Default to out of scope with the original message
        return {
          intent: "out_of_scope",
          message: content
        };
      }
    } catch (error) {
      console.error('Error calling LLM:', error);
      return {
        intent: "out_of_scope",
        message: "I'm having trouble connecting to the AI service. Please try again later."
      };
    }
  }

  const fetchLendingOpportunities = async () => {
    try {
      const response = await fetch('/api/lending-opportunities');
      if (!response.ok) {
        throw new Error('Failed to fetch lending opportunities');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching lending opportunities:', error);
      return [];
    }
  }

  const handleBuySol = async (amount: number) => {
    if (!publicKey) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Please connect your Solana wallet first to receive your SOL."
      }]);
      return;
    }

    try {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `Getting quote for ${amount} SOL on Solana Devnet...`
      }]);

      await getQuote(amount);
      
      if (onrampError) {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `Error: ${onrampError}`
        }]);
        return;
      }

      if (currentQuote) {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `I've found a way to buy ${amount} SOL on Solana Devnet. Here are the details:`,
          options: [{
            platform: "MoonPay",
            type: "buy",
            apy: 0,
            riskLevel: "low",
            description: `Buy ${amount} SOL for $${currentQuote.inputAmount} (including fees)`,
            url: currentQuote.redirectUrl || '',
            tokenSymbol: "SOL"
          }]
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: "Sorry, I couldn't get a quote at this time. Please try again later."
        }]);
      }
    } catch (error) {
      console.error('Error in handleBuySol:', error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: error instanceof Error 
          ? `Error: ${error.message}`
          : "I'm having trouble processing your buy request. Please try again."
      }]);
    }
  };

  const handleConfirmPurchase = () => {
    try {
      confirmPurchase();
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Opening MoonPay payment page. Please complete your purchase there. You'll receive your SOL on Solana Devnet after the payment is processed."
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, there was an error opening the payment page. Please try again."
      }]);
    }
  };

  const handleCancelPurchase = () => {
    cancelPurchase();
    setMessages(prev => [...prev, {
      role: "assistant",
      content: "Purchase cancelled. Would you like to try a different amount?"
    }]);
  };

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage = input
    setInput("")
    setMessages(prev => [...prev, { role: "user", content: userMessage }])
    setIsTyping(true)

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
              content: "Please specify a valid amount of SOL to buy."
            }]);
          }
          break;

        case "explore_yield":
          const opportunities = await fetchLendingOpportunities();
          setMessages(prev => [...prev, {
            role: "assistant",
            content: llmResponse.message, // Use LLM's message for yield options
            options: opportunities
          }]);
          break;

        case "view_portfolio":
          // TODO: Implement portfolio view logic
          setMessages(prev => [...prev, {
            role: "assistant",
            content: llmResponse.message // Use LLM's message for portfolio view
          }]);
          break;

        default:
          setMessages(prev => [...prev, {
            role: "assistant",
            content: llmResponse.message // Directly display LLM's message for out-of-scope
          }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "I'm having trouble understanding. Please try again or use the buttons below."
      }]);
    } finally {
      setIsTyping(false)
    }
  }

  const handleQuickAction = (action: string) => {
    setInput(action)
    handleSend()
  }

  const handleStake = async (platform: string, amount: number) => {
    if (!publicKey) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Please connect your wallet first."
      }]);
      return;
    }

    try {
      const response = await fetch('/api/lending-opportunities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          protocol: platform,
          action: 'stake',
          amount,
          walletAddress: publicKey.toString()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process staking request');
      }

      const result = await response.json();
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `Successfully initiated staking on ${platform}. Transaction: ${result.txHash}`
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Failed to process staking request. Please try again."
      }]);
    }
  }

  if (!connected) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-white mb-4">Please connect your Solana wallet to get started.</p>
          <Button className="bg-[#34C759] hover:bg-[#2FB350] text-white">
            Connect Wallet
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={cn(
              "flex",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-lg p-3",
                message.role === "user"
                  ? "bg-[#2C3444] text-white"
                  : "bg-[#252C3B] text-white"
              )}
            >
              <p>{message.content}</p>
              {message.options && (
                <div className="mt-4 space-y-3">
                  {message.options.map((option, i) => (
                    <div
                      key={i}
                      className="bg-[#1E2533] rounded-lg p-3 border border-[#34C759]"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold">{option.platform}</span>
                        <span className="text-[#34C759] text-lg font-bold">
                          {option.apy}%
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mb-2">{option.description}</p>
                      <div className="flex justify-between items-center">
                        <span className={cn(
                          "text-sm",
                          option.riskLevel === "low" && "text-green-400",
                          option.riskLevel === "medium" && "text-yellow-400",
                          option.riskLevel === "high" && "text-red-400"
                        )}>
                          {option.riskLevel.charAt(0).toUpperCase() + option.riskLevel.slice(1)} Risk
                        </span>
                        {option.type === 'buy' ? (
                          <Button 
                            className="bg-[#34C759] hover:bg-[#2FB350] text-white text-sm"
                            onClick={() => window.open(option.url, '_blank')}
                          >
                            Proceed to Buy
                          </Button>
                        ) : (
                          <Button 
                            className="bg-[#34C759] hover:bg-[#2FB350] text-white text-sm"
                            onClick={() => handleStake(option.platform, 1)}
                          >
                            Stake Now
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {currentQuote && (
          <div className="flex justify-start">
            <div className="max-w-[80%]">
              <QuoteWidget
                quote={currentQuote}
                onConfirm={handleConfirmPurchase}
                onCancel={handleCancelPurchase}
              />
            </div>
          </div>
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

      {/* Quick Action Buttons */}
      <div className="p-4 border-t border-[#252C3B]">
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            variant="outline"
            className="bg-[#1E2533] text-white hover:bg-[#252C3B]"
            onClick={() => handleQuickAction("Buy 0.1 SOL")}
          >
            Buy SOL
          </Button>
          <Button
            variant="outline"
            className="bg-[#1E2533] text-white hover:bg-[#252C3B]"
            onClick={() => handleQuickAction("Show me yield options")}
          >
            Explore Yield Options
          </Button>
          <Button
            variant="outline"
            className="bg-[#1E2533] text-white hover:bg-[#252C3B]"
            onClick={() => handleQuickAction("View my portfolio")}
          >
            View Portfolio
          </Button>
        </div>

        {/* Input Area */}
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type your message..."
            className="flex-1 bg-[#1E2533] border-[#252C3B] text-white focus:border-[#34C759]"
          />
          <Button
            onClick={handleSend}
            className="bg-[#34C759] hover:bg-[#2FB350] text-white"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}