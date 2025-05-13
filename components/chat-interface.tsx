// "use client"
// import { useState, useRef, useEffect } from "react"
// import { Send, ArrowRight, Check, X } from "lucide-react"
// import { useWallet } from "@solana/wallet-adapter-react"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { cn } from "@/lib/utils"
// import { useOnramp } from '@/hooks/useOnramp'
// import { useJupiter } from '@/hooks/useJupiter'
// import { VersionedTransaction } from "@solana/web3.js"
// import { fetchSolendPoolsByMint, SolendPool } from '../lib/solend'
// import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js'
// import ReactMarkdown from 'react-markdown'
// import config from '../lib/config'
// import { usePrivyAuth } from "@/components/privy/privy-auth-provider"

// // Import token list
// import tokenList from '../token.json'

// interface Message {
//   role: "user" | "assistant"
//   content: string
//   options?: Array<{
//     platform: string
//     type: 'lend' | 'buy'
//     apy: number
//     riskLevel: "low" | "medium" | "high"
//     description: string
//     url: string
//     tokenSymbol: string
//     tvl?: number
//     protocolFee?: number
//     withdrawalFee?: number
//     additionalRewards?: {
//       token: string
//       apy: number
//     }[]
//   }>
//   // Add messageId for easier reference
//   messageId?: string
// }

// interface LLMResponse {
//   intent: "buy_sol" | "buy_token" | "explore_yield" | "view_portfolio" | "out_of_scope"
//   amount?: number | null
//   currency?: string
//   token?: string
//   message: string
// }

// interface OnrampQuote {
//   provider: string;
//   inputAmount: number;
//   inputCurrency: string;
//   outputAmount: number;
//   outputCurrency: string;
//   fees: {
//     provider: number;
//     network: number;
//     total: number;
//   };
//   estimatedProcessingTime: string;
//   exchangeRate: number;
//   network: string;
//   redirectUrl?: string;
// }

// interface SwapQuoteWidget {
//   requestId: string;
//   inputToken: string;
//   inputAmount: number;
//   outputToken: string;
//   outputAmount: number;
//   priceImpact: string;
//   exchangeRate: number;
// }

// const SYSTEM_PROMPT = `You are a financial assistant for a Solana-based Trading/Yield Agent. Your role is to parse user inputs and identify one of the following intents: buy SOL, buy token, explore yield options, view portfolio, or out-of-scope.

// For buy SOL requests, parse the amount and currency. Examples:
// - "I want to buy 1 SOL" -> { "intent": "buy_sol", "amount": 1, "currency": "SOL" }
// - "Buy 0.5 SOL" -> { "intent": "buy_sol", "amount": 0.5, "currency": "SOL" }
// - "Purchase 2 SOL" -> { "intent": "buy_sol", "amount": 2, "currency": "SOL" }

// For buy token requests, parse the amount and token name. Examples:
// - "I want to buy 10 USDC" -> { "intent": "buy_token", "amount": 10, "token": "USDC" }
// - "Buy 5 Trump token" -> { "intent": "buy_token", "amount": 5, "token": "TRUMP" }
// - "Get me 20 BONK" -> { "intent": "buy_token", "amount": 20, "token": "BONK" }

// For each response, return a structured JSON with:
// {
//   "intent": "buy_sol" | "buy_token" | "explore_yield" | "view_portfolio" | "out_of_scope",
//   "amount": number | null,  // Required for buy_sol and buy_token intents
//   "currency": "SOL",       // Required for buy_sol intent
//   "token": string,         // Required for buy_token intent
//   "message": string        // User-friendly response
// }

// Keep all responses concise (under 100 characters) and conversational.`;

// interface QuoteWidgetProps {
//   quote: OnrampQuote;
//   onConfirm: () => void;
//   onCancel: () => void;
//   isProcessing?: boolean;
// }

// function QuoteWidget({ quote, onConfirm, onCancel, isProcessing = false }: QuoteWidgetProps) {
//   return (
//     <div className="bg-[#1E2533] rounded-lg p-4 border border-[#34C759] mt-4">
//       <div className="flex justify-between items-center mb-4">
//         <h3 className="text-lg font-semibold text-white">MoonPay Purchase</h3>
//         <span className="text-[#34C759] text-lg font-bold">
//           {quote.outputAmount} {quote.outputCurrency}
//         </span>
//       </div>
      
//       <div className="space-y-2 text-sm text-gray-400">
//         <div className="flex justify-between">
//           <span>You Pay:</span>
//           <span className="text-white">${quote.inputAmount} {quote.inputCurrency}</span>
//         </div>
//         <div className="flex justify-between">
//           <span>You Receive:</span>
//           <span className="text-white">{quote.outputAmount} {quote.outputCurrency}</span>
//         </div>
//         <div className="flex justify-between">
//           <span>Provider Fee:</span>
//           <span className="text-white">${quote.fees.provider.toFixed(2)}</span>
//         </div>
//         <div className="flex justify-between">
//           <span>Network Fee:</span>
//           <span className="text-white">${quote.fees.network.toFixed(2)}</span>
//         </div>
//         <div className="flex justify-between">
//           <span>Total Fees:</span>
//           <span className="text-white">${quote.fees.total.toFixed(2)}</span>
//         </div>
//         <div className="flex justify-between">
//           <span>Exchange Rate:</span>
//           <span className="text-white">1 {quote.inputCurrency} = {quote.exchangeRate.toFixed(6)} {quote.outputCurrency}</span>
//         </div>
//         <div className="flex justify-between">
//           <span>Network:</span>
//           <span className="text-white">Solana Devnet</span>
//         </div>
//         <div className="flex justify-between">
//           <span>Processing Time:</span>
//           <span className="text-white">{quote.estimatedProcessingTime}</span>
//         </div>
//       </div>

//       <div className="flex gap-3 mt-4">
//         <Button
//           onClick={onConfirm}
//           disabled={isProcessing}
//           className="flex-1 bg-[#34C759] hover:bg-[#2FB350] text-white"
//         >
//           {isProcessing ? (
//             <span className="flex items-center">
//               <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//               </svg>
//               Processing...
//             </span>
//           ) : (
//             <>
//               <Check className="h-4 w-4 mr-2" />
//               Proceed to Payment
//             </>
//           )}
//         </Button>
//         <Button
//           onClick={onCancel}
//           disabled={isProcessing}
//           variant="outline"
//           className="flex-1 border-[#34C759] text-[#34C759] hover:bg-[#34C759] hover:text-white"
//         >
//           <X className="h-4 w-4 mr-2" />
//           Cancel
//         </Button>
//       </div>
//     </div>
//   );
// }

// interface SwapWidgetProps {
//   quote: SwapQuoteWidget;
//   onConfirm: () => void;
//   onCancel: () => void;
//   isProcessing?: boolean;
// }

// function SwapWidget({ quote, onConfirm, onCancel, isProcessing = false }: SwapWidgetProps) {
//   return (
//     <div className="bg-[#1E2533] rounded-lg p-4 border border-[#34C759] mt-4">
//       <div className="flex justify-between items-center mb-4">
//         <h3 className="text-lg font-semibold text-white">Jupiter Swap</h3>
//         <span className="text-[#34C759] text-lg font-bold">
//           {quote.outputAmount} {quote.outputToken}
//         </span>
//       </div>
      
//       <div className="space-y-2 text-sm text-gray-400">
//         <div className="flex justify-between">
//           <span>You Pay:</span>
//           <span className="text-white">{quote.inputAmount.toFixed(4)} {quote.inputToken}</span>
//         </div>
//         <div className="flex justify-between">
//           <span>You Receive:</span>
//           <span className="text-white">{quote.outputAmount.toFixed(6)} {quote.outputToken}</span>
//         </div>
//         <div className="flex justify-between">
//           <span>Price Impact:</span>
//           <span className="text-white">{quote.priceImpact}%</span>
//         </div>
//         <div className="flex justify-between">
//           <span>Exchange Rate:</span>
//           <span className="text-white">1 {quote.inputToken} = {quote.exchangeRate.toFixed(6)} {quote.outputToken}</span>
//         </div>
//         <div className="flex justify-between">
//           <span>Network:</span>
//           <span className="text-white">Solana</span>
//         </div>
//       </div>

//       <div className="flex gap-3 mt-4">
//         <Button
//           onClick={onConfirm}
//           disabled={isProcessing}
//           className="flex-1 bg-[#34C759] hover:bg-[#2FB350] text-white"
//         >
//           {isProcessing ? (
//             <span className="flex items-center">
//               <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//               </svg>
//               Processing...
//             </span>
//           ) : (
//             <>
//               <Check className="h-4 w-4 mr-2" />
//               Confirm Swap
//             </>
//           )}
//         </Button>
//         <Button
//           onClick={onCancel}
//           disabled={isProcessing}
//           variant="outline"
//           className="flex-1 border-[#34C759] text-[#34C759] hover:bg-[#34C759] hover:text-white"
//         >
//           <X className="h-4 w-4 mr-2" />
//           Cancel
//         </Button>
//       </div>
//     </div>
//   );
// }

// // Improved helper to extract token symbol from user input for yield intent
// function extractTokenSymbolFromYieldQuery(query: string): string | null {
//   // Try to match various patterns of asking about yield
//   const patterns = [
//     /yield(?: options?)?(?: for)? (\w+)/i,
//     /(\w+) yield/i,
//     /earn(?: on| with)? (\w+)/i,
//     /invest(?: in)? (\w+)/i,
//     /lend(?: my)? (\w+)/i,
//     /deposit(?: my)? (\w+)/i,
//     /stake(?: my)? (\w+)/i
//   ];
  
//   for (const pattern of patterns) {
//     const match = query.match(pattern);
//     if (match) return match[1].toUpperCase();
//   }
  
//   return null;
// }

// // Generate a unique ID for each message
// function generateMessageId(): string {
//   return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
// }

// // Add a helper function to create the Alchemy connection
// const getAlchemyConnection = () => {
//   return new Connection(
//     'https://solana-mainnet.g.alchemy.com/v2/8C_dA-kDjbNFZU_oTAPU05eiHvmh61-K',
//     {
//       commitment: 'confirmed',
//       wsEndpoint: undefined // Disable WebSocket for this connection
//     }
//   );
// };

// export function ChatInterface() {
//   // Add Privy auth hook with all needed methods
//   const { isAuthenticated, walletAddress, sendTransaction: privySendTransaction } = usePrivyAuth()
//   const [messages, setMessages] = useState<Message[]>([
//     {
//       role: "assistant",
//       content: "Hello! I can help you buy SOL, buy other tokens, explore yield options, or check your portfolio. What would you like to do?",
//       messageId: generateMessageId()
//     }
//   ])
//   const [input, setInput] = useState("")
//   const [isTyping, setIsTyping] = useState(false)
//   const messagesEndRef = useRef<HTMLDivElement>(null)
//   const { connected, publicKey, sendTransaction, signTransaction } = useWallet()
//   const { 
//     isProcessing: isProcessingBuy, 
//     currentQuote, 
//     error: onrampError,
//     getQuote,
//     confirmPurchase,
//     cancelPurchase,
//     handleSuccess,
//     handleCancel
//   } = useOnramp()

//   // Add Jupiter hook
//   const {
//     isLoading: isLoadingSwap,
//     orderResponse: jupiterOrder,
//     swapResult,
//     error: jupiterError,
//     getOrder: getJupiterOrder,
//     executeSwap,
//     clearOrder: clearJupiterOrder,
//     clearResult: clearSwapResult
//   } = useJupiter()

//   // State for Jupiter swap quote widget
//   const [swapQuoteWidget, setSwapQuoteWidget] = useState<SwapQuoteWidget | null>(null)
//   const [isSwapProcessing, setIsSwapProcessing] = useState(false)

//   // Lending state
//   const [solendPools, setSolendPools] = useState<SolendPool[] | null>(null)
//   const [lendingToken, setLendingToken] = useState<{ symbol: string, mint: string } | null>(null)
//   const [lendingAmount, setLendingAmount] = useState<number | null>(null)
//   const [selectedPool, setSelectedPool] = useState<SolendPool | null>(null)
//   const [showLendingConfirm, setShowLendingConfirm] = useState(false)
//   const [isPendingResponse, setIsPendingResponse] = useState(false)
//   const [passiveIncomeHandlers, setPassiveIncomeHandlers] = useState<{
//     onConfirm: () => void;
//     onDecline: () => void;
//   } | null>(null)

//   // Keep track of the message ID that has the passive income prompt
//   const [passiveIncomeMessageId, setPassiveIncomeMessageId] = useState<string | null>(null)
//   const [isPassiveIncomeResponsePending, setIsPassiveIncomeResponsePending] = useState(false)

//   // Determine which wallet is being used for display purposes
//   const activeWalletAddress = walletAddress || (publicKey ? publicKey.toString() : null);
//   const isWalletConnected = isAuthenticated || connected;

//   // Update the effect to handle URL parameters
//   useEffect(() => {
//     const searchParams = new URLSearchParams(window.location.search);
//     const status = searchParams.get('status');
    
//     if (status === 'success') {
//       setMessages(prev => [...prev, {
//         role: "assistant",
//         content: "Your SOL purchase was successful! The tokens will be sent to your wallet on Solana Devnet shortly. You can check your wallet balance in a few minutes.",
//         messageId: generateMessageId()
//       }]);
//       handleSuccess();
      
//       // Offer passive income options for SOL after purchase
//       setTimeout(() => {
//         handlePassiveIncomePrompt("SOL");
//       }, 1000);
      
//       // Clean up the URL
//       window.history.replaceState({}, '', '/chat');
//     } else if (status === 'cancel') {
//       setMessages(prev => [...prev, {
//         role: "assistant",
//         content: "Your SOL purchase was cancelled. Would you like to try again?",
//         messageId: generateMessageId()
//       }]);
//       handleCancel();
//       // Clean up the URL
//       window.history.replaceState({}, '', '/chat');
//     }
//   }, [handleSuccess, handleCancel]);

//   // Updated effect to handle swap result with proper passive income flow
//   useEffect(() => {
//     if (swapResult) {
//       if (swapResult.status === 'Success') {
//         const successMsgId = generateMessageId();
//         setMessages(prev => [...prev, {
//           role: "assistant",
//           content: `Your token swap was successful! Transaction signature: ${swapResult.signature}`,
//           messageId: successMsgId
//         }]);
        
//         // If this was a token purchase, prompt for passive income options after a short delay
//         if (swapQuoteWidget) {
//           const tokenSymbol = swapQuoteWidget.outputToken;
//           // Save widget data before clearing it
//           const outputToken = swapQuoteWidget.outputToken;
          
//           // Clear swap data but keep token info for passive income
//           setIsSwapProcessing(false);
//           clearSwapResult();
//           setSwapQuoteWidget(null);
          
//           // Wait a moment before showing the passive income prompt
//           setTimeout(() => {
//             handlePassiveIncomePrompt(outputToken);
//           }, 1000);
//         }
//       } else {
//         setMessages(prev => [...prev, {
//           role: "assistant",
//           content: `Swap failed: ${swapResult.error || 'Unknown error'}`,
//           messageId: generateMessageId()
//         }]);
//         setIsSwapProcessing(false);
//         clearSwapResult();
//         setSwapQuoteWidget(null);
//       }
//     }
//   }, [swapResult, clearSwapResult]);

//   // Updated effect to clean up passive income state when not needed
//   useEffect(() => {
//     // Clean up passive income state when no buttons are displayed
//     if (!messages.some(msg => msg.messageId === passiveIncomeMessageId)) {
//       setPassiveIncomeMessageId(null);
//       setPassiveIncomeHandlers(null);
//     }
//   }, [messages, passiveIncomeMessageId]);

//   const scrollToBottom = () => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
//   }

//   useEffect(() => {
//     scrollToBottom()
//   }, [messages])

//   const processLLMResponse = async (userMessage: string): Promise<LLMResponse> => {
//     const apiKey = process.env.NEXT_PUBLIC_TOGETHER_API_KEY;
    
//     if (!apiKey) {
//       console.error('Together AI API key is not configured');
//       return {
//         intent: "out_of_scope",
//         message: "The AI service is not properly configured. Please check your environment settings."
//       };
//     }

//     try {
//       const response = await fetch('https://api.together.xyz/v1/chat/completions', {
//         method: 'POST',
//         headers: {
//           'Authorization': `Bearer ${apiKey}`,
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           model: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
//           messages: [
//             { role: 'system', content: SYSTEM_PROMPT },
//             { role: 'user', content: userMessage }
//           ],
//           temperature: 0.1,
//           max_tokens: 500,
//         }),
//       });

//       if (!response.ok) {
//         if (response.status === 401) {
//           console.error('Invalid Together AI API key');
//           return {
//             intent: "out_of_scope",
//             message: "The AI service is not properly configured. Please check your API key."
//           };
//         }
//         throw new Error(`Together AI API error: ${response.status} ${response.statusText}`);
//       }

//       const data = await response.json();
//       const content = data.choices[0].message.content;
      
//       try {
//         // Try to parse as JSON first
//         const parsedResponse = JSON.parse(content);
//         if (!parsedResponse.intent || !parsedResponse.message) {
//           throw new Error('Invalid response format');
//         }
//         return parsedResponse;
//       } catch (e) {
//         // If JSON parsing fails, analyze the text response
//         console.log('LLM returned non-JSON response:', content);
        
//         // Check if the response contains a buy SOL request
//         const solMatch = content.match(/buy\s+(\d+(?:\.\d+)?)\s*sol/i);
//         if (solMatch) {
//           const amount = parseFloat(solMatch[1]);
//           return {
//             intent: "buy_sol",
//             amount: amount,
//             currency: "SOL",
//             message: content
//           };
//         }

//         // Check if the response contains a buy token request
//         const tokenMatch = content.match(/buy\s+(\d+(?:\.\d+)?)\s*(USDC|TRUMP|BONK|PEPE|DOGE|BTC)/i);
//         if (tokenMatch) {
//           const amount = parseFloat(tokenMatch[1]);
//           const token = tokenMatch[2].toUpperCase();
//           return {
//             intent: "buy_token",
//             amount: amount,
//             token: token,
//             message: content
//           };
//         }

//         // Check for other intents
//         if (content.toLowerCase().includes('yield') || content.toLowerCase().includes('earn')) {
//           return {
//             intent: "explore_yield",
//             message: content
//           };
//         }

//         if (content.toLowerCase().includes('portfolio') || content.toLowerCase().includes('balance')) {
//           return {
//             intent: "view_portfolio",
//             message: content
//           };
//         }

//         // Default to out of scope with the original message
//         return {
//           intent: "out_of_scope",
//           message: content
//         };
//       }
//     } catch (error) {
//       console.error('Error calling LLM:', error);
//       return {
//         intent: "out_of_scope",
//         message: "I'm having trouble connecting to the AI service. Please try again later."
//       };
//     }
//   }

//   // Function to find token by name or symbol
//   const findToken = (tokenName: string) => {
//     const normalizedTokenName = tokenName.toLowerCase();
//     return tokenList.find(token => 
//       token.symbol.toLowerCase() === normalizedTokenName || 
//       token.name.toLowerCase().includes(normalizedTokenName)
//     );
//   };

//   /* Unused API - commenting out
//   const fetchLendingOpportunities = async () => {
//     try {
//       const response = await fetch('/api/lending-opportunities');
//       if (!response.ok) {
//         throw new Error('Failed to fetch lending opportunities');
//       }
//       return await response.json();
//     } catch (error) {
//       console.error('Error fetching lending opportunities:', error);
//       return [];
//     }
//   }
//   */

//   const handleBuySol = async (amount: number) => {
//     if (!publicKey && !isAuthenticated) {
//       setMessages(prev => [...prev, {
//         role: "assistant",
//         content: "Please connect your Solana wallet first to receive your tokens.",
//         messageId: generateMessageId()
//       }]);
//       return;
//     }

//     try {
//       const loadingMsgId = generateMessageId();
//       setMessages(prev => [...prev, {
//         role: "assistant",
//         content: `Getting quote for ${amount} SOL on Solana Devnet...`,
//         messageId: loadingMsgId
//       }]);

//       await getQuote(amount);
      
//       if (onrampError) {
//         // Replace loading message with error
//         setMessages(prev => prev.map(msg => 
//           msg.messageId === loadingMsgId 
//             ? { ...msg, content: `Error: ${onrampError}` }
//             : msg
//         ));
//         return;
//       }

//       if (currentQuote) {
//         // Replace loading message with quote
//         setMessages(prev => prev.map(msg => 
//           msg.messageId === loadingMsgId 
//             ? { 
//                 ...msg, 
//                 content: `I've found a way to buy ${amount} SOL on Solana Devnet. Here are the details:`,
//                 options: [{
//                   platform: "MoonPay",
//                   type: "buy",
//                   apy: 0,
//                   riskLevel: "low",
//                   description: `Buy ${amount} SOL for $${currentQuote.inputAmount} (including fees)`,
//                   url: currentQuote.redirectUrl || '',
//                   tokenSymbol: "SOL"
//                 }]
//               }
//             : msg
//         ));
//       } else {
//         // Replace loading message with error
//         setMessages(prev => prev.map(msg => 
//           msg.messageId === loadingMsgId 
//             ? { ...msg, content: "Sorry, I couldn't get a quote at this time. Please try again later." }
//             : msg
//         ));
//       }
//     } catch (error) {
//       console.error('Error in handleBuySol:', error);
//       setMessages(prev => [...prev, {
//         role: "assistant",
//         content: error instanceof Error 
//           ? `Error: ${error.message}`
//           : "I'm having trouble processing your buy request. Please try again.",
//         messageId: generateMessageId()
//       }]);
//     }
//   };

//   // Function to handle buying a token with Jupiter
//   const handleBuyToken = async (amount: number, tokenName: string) => {
//     if (!publicKey && !isAuthenticated) {
//       setMessages(prev => [...prev, {
//         role: "assistant",
//         content: "Please connect your Solana wallet first to receive your tokens.",
//         messageId: generateMessageId()
//       }]);
//       return;
//     }

//     // Find token in the token list
//     const token = findToken(tokenName);
//     if (!token) {
//       setMessages(prev => [...prev, {
//         role: "assistant",
//         content: `Sorry, I couldn't find the token "${tokenName}" in our supported tokens list.`,
//         messageId: generateMessageId()
//       }]);
//       return;
//     }

//     try {
//       const loadingMsgId = generateMessageId();
//       setMessages(prev => [...prev, {
//         role: "assistant",
//         content: `Getting quote to buy ${amount} ${token.symbol} with SOL...`,
//         messageId: loadingMsgId
//       }]);

//       // Get order directly with transaction included
//       const order = await getJupiterOrder(token.address, amount);
      
//       if (jupiterError) {
//         // Replace loading message with error
//         setMessages(prev => prev.map(msg => 
//           msg.messageId === loadingMsgId 
//             ? { ...msg, content: `Error: ${jupiterError}` }
//             : msg
//         ));
//         return;
//       }

//       if (!order) {
//         // Replace loading message with error if missing transaction
//         setMessages(prev => prev.map(msg => 
//           msg.messageId === loadingMsgId 
//             ? { ...msg, content: "Sorry, I couldn't get a valid swap quote. Please try again later." }
//             : msg
//         ));
//         return;
//       }

//       console.log("Processing order for Jupiter swap:", order);

//       try {
//         // Get input and output amounts from the order
//         const inAmountNumber = parseFloat(order.inAmount) / Math.pow(10, 9); // SOL is always 9 decimals
//         const outAmountNumber = parseFloat(order.outAmount) / Math.pow(10, token.decimals);
        
//         // Calculate exchange rate
//         const exchangeRate = outAmountNumber / inAmountNumber;

//         // Create quote widget data
//         const quoteWidget: SwapQuoteWidget = {
//           requestId: order.requestId,
//           inputToken: "SOL",
//           inputAmount: inAmountNumber,
//           outputToken: token.symbol,
//           outputAmount: outAmountNumber,
//           priceImpact: order.priceImpactPct,
//           exchangeRate: exchangeRate
//         };

//         console.log("Created swap quote widget:", quoteWidget);
//         setSwapQuoteWidget(quoteWidget);

//         // Replace loading message with quote info
//         setMessages(prev => prev.map(msg => 
//           msg.messageId === loadingMsgId 
//             ? { ...msg, content: `I've found a swap quote to buy ${amount} ${token.symbol}. Would you like to proceed?` }
//             : msg
//         ));
//       } catch (error) {
//         console.error("Error processing order data:", error);
//         setMessages(prev => prev.map(msg => 
//           msg.messageId === loadingMsgId 
//             ? { ...msg, content: "Sorry, there was an error processing the swap quote. Please try again." }
//             : msg
//         ));
//       }
//     } catch (error) {
//       console.error('Error in handleBuyToken:', error);
//       setMessages(prev => [...prev, {
//         role: "assistant",
//         content: error instanceof Error 
//           ? `Error: ${error.message}`
//           : "I'm having trouble processing your token swap request. Please try again.",
//         messageId: generateMessageId()
//       }]);
//     }
//   };

//   // Update the handleConfirmSwap function to use the helper
//   const handleConfirmSwap = async () => {
//     if (!swapQuoteWidget) {
//       setMessages(prev => [...prev, {
//         role: "assistant",
//         content: "There was an error with the swap. Please try again.",
//         messageId: generateMessageId()
//       }]);
//       return;
//     }

//     try {
//       setIsSwapProcessing(true);
//       const processingMsgId = generateMessageId();
      
//       setMessages(prev => [...prev, {
//         role: "assistant",
//         content: "Please approve the transaction in your wallet...",
//         messageId: processingMsgId
//       }]);
      
//       if (!jupiterOrder || !jupiterOrder.transaction) {
//         throw new Error("Failed to get transaction details");
//       }
      
//       // Use the helper function to get the connection
//       const connection = getAlchemyConnection();
      
//       // Deserialize the transaction from Jupiter
//       const transaction = VersionedTransaction.deserialize(
//         Buffer.from(jupiterOrder.transaction, 'base64')
//       );
      
//       // Sign the transaction and serialize it (each wallet type handles this differently)
//       let signature;
//       let signedTransaction;
      
//       if (isAuthenticated && walletAddress && privySendTransaction) {
//         console.log("Using Privy wallet for transaction");
//         try {
//           // For Privy wallet, we need to:
//           // 1. Sign and send the transaction
//           // 2. Get the serialized signed transaction
          
//           // This is a workaround since Privy doesn't expose a way to just sign
//           // We sign and send first to get user approval but use the serialized transaction for Jupiter
//           signature = await privySendTransaction(transaction, connection);
          
//           // We can't directly get the signed transaction from Privy
//           // For now, update the user that we're preparing the transaction for Jupiter
//           setMessages(prev => prev.map(msg => 
//             msg.messageId === processingMsgId 
//               ? { ...msg, content: `Transaction approved! Preparing for execution...` }
//               : msg
//           ));
          
//           // We need to retrieve the transaction to get the serialized version
//           // Use the Alchemy connection here too to avoid 403 errors
//           const confirmedTx = await getAlchemyConnection().getTransaction(signature, {
//             commitment: 'confirmed',
//             maxSupportedTransactionVersion: 0
//           });
          
//           if (!confirmedTx || !confirmedTx.transaction) {
//             throw new Error("Failed to retrieve the signed transaction");
//           }
          
//           // Use any type to bypass type checking errors with serialize method
//           signedTransaction = Buffer.from((confirmedTx.transaction as any).serialize()).toString('base64');
//         } catch (err) {
//           console.error("Privy sendTransaction error:", err);
//           throw new Error(`Privy wallet error: ${err instanceof Error ? err.message : 'Unknown error'}`);
//         }
//       } else if (connected && publicKey && signTransaction) {
//         // If signTransaction is available, use it directly for better UX
//         console.log("Using Solana wallet adapter's signTransaction method");
//         try {
//           // Cast to any to bypass the type checking errors
//           const signedTx = await signTransaction(transaction);
          
//           // Use a more generic approach to serialize
//           signedTransaction = Buffer.from((signedTx as any).serialize()).toString('base64');
          
//           // Update the message that transaction was signed
//           setMessages(prev => prev.map(msg => 
//             msg.messageId === processingMsgId 
//               ? { ...msg, content: `Transaction signed! Preparing for execution...` }
//               : msg
//           ));
//         } catch (err) {
//           console.error("Solana wallet signTransaction error:", err);
//           throw new Error(`Wallet error: ${err instanceof Error ? err.message : 'Unknown error'}`);
//         }
//       } else if (connected && publicKey && sendTransaction) {
//         console.log("Using Solana wallet adapter's sendTransaction method");
//         try {
//           // When using Solana wallet adapter, we can:
//           // 1. Sign the transaction (if the adapter supports it)
//           // 2. Serialize it and send to Jupiter
          
//           // First sign and get signature
//           signature = await sendTransaction(transaction, connection);
          
//           // Update the message that we got signature
//           setMessages(prev => prev.map(msg => 
//             msg.messageId === processingMsgId 
//               ? { ...msg, content: `Transaction approved! Preparing for execution...` }
//               : msg
//           ));
          
//           // We need to retrieve the transaction to get the serialized version
//           // Use the Alchemy connection here too to avoid 403 errors
//           const confirmedTx = await getAlchemyConnection().getTransaction(signature, {
//             commitment: 'confirmed',
//             maxSupportedTransactionVersion: 0
//           });
          
//           if (!confirmedTx || !confirmedTx.transaction) {
//             throw new Error("Failed to retrieve the signed transaction");
//           }
          
//           // Use any type to bypass type checking errors with serialize method
//           signedTransaction = Buffer.from((confirmedTx.transaction as any).serialize()).toString('base64');
//         } catch (err) {
//           console.error("Solana wallet adapter error:", err);
//           throw new Error(`Wallet error: ${err instanceof Error ? err.message : 'Unknown error'}`);
//         }
//       } else {
//         throw new Error("No wallet is available to sign the transaction");
//       }
      
//       if (!signedTransaction) {
//         throw new Error("Failed to get signed transaction");
//       }
      
//       // Update processing message
//       setMessages(prev => prev.map(msg => 
//         msg.messageId === processingMsgId 
//           ? { ...msg, content: `Transaction signed! Executing swap with Jupiter...` }
//           : msg
//       ));
      
//       // Execute the order with the signed transaction
//       const result = await executeSwap(signedTransaction);
      
//       if (result) {
//         if (result.status === 'Success') {
//           // Update with success message using the signature from the result
//           const txSignature = result.signature || signature;
//       setMessages(prev => prev.map(msg => 
//         msg.messageId === processingMsgId 
//               ? { ...msg, content: `Swap successful! [View transaction](https://explorer.solana.com/tx/${txSignature}?cluster=mainnet-beta)` }
//           : msg
//       ));
      
//       // Store output token before clearing swap info
//       const outputToken = swapQuoteWidget.outputToken;
      
//       // Clear the swap info
//       setIsSwapProcessing(false);
//       setSwapQuoteWidget(null);
//           clearJupiterOrder();
      
//       // Prompt for passive income directly after clearing swap info
//       // with a slight delay for better UX
//       setTimeout(() => {
//         handlePassiveIncomePrompt(outputToken);
//       }, 1500);
//         } else {
//           // Handle error case
//           setMessages(prev => prev.map(msg => 
//             msg.messageId === processingMsgId 
//               ? { ...msg, content: `Swap failed: ${result.error || 'Unknown error'}` }
//               : msg
//           ));
//           setIsSwapProcessing(false);
//           setSwapQuoteWidget(null);
//           clearJupiterOrder();
//         }
//       }
//     } catch (error) {
//       console.error('Error confirming swap:', error);
//       setMessages(prev => [...prev, {
//         role: "assistant",
//         content: error instanceof Error 
//           ? `Error with swap: ${error.message}`
//           : "There was an error executing your swap. Please try again.",
//         messageId: generateMessageId()
//       }]);
//       setIsSwapProcessing(false);
//       setSwapQuoteWidget(null);
//       clearJupiterOrder();
//     }
//   };

//   // Function to handle Jupiter swap cancellation
//   const handleCancelSwap = () => {
//     clearJupiterOrder();
//     setSwapQuoteWidget(null);
//     setMessages(prev => [...prev, {
//       role: "assistant",
//       content: "Swap cancelled. Would you like to try a different amount?",
//       messageId: generateMessageId()
//     }]);
//   };

//   const handleConfirmPurchase = () => {
//     try {
//       confirmPurchase();
//       setMessages(prev => [...prev, {
//         role: "assistant",
//         content: "Opening MoonPay payment page. Please complete your purchase there. You'll receive your SOL on Solana Devnet after the payment is processed.",
//         messageId: generateMessageId()
//       }]);
//     } catch (error) {
//       setMessages(prev => [...prev, {
//         role: "assistant",
//         content: "Sorry, there was an error opening the payment page. Please try again.",
//         messageId: generateMessageId()
//       }]);
//     }
//   };

//   const handleCancelPurchase = () => {
//     cancelPurchase();
//     setMessages(prev => [...prev, {
//       role: "assistant",
//       content: "Purchase cancelled. Would you like to try a different amount?",
//       messageId: generateMessageId()
//     }]);
//   };

//   // Function to handle passive income prompt with proper button setup
//   const handlePassiveIncomePrompt = async (tokenSymbol: string) => {
//     // Find token in the token list to get both symbol and mint
//     const token = findToken(tokenSymbol);
//     if (!token || !token.address) {
//       setMessages(prev => [...prev, {
//         role: "assistant",
//         content: `I couldn't find details for ${tokenSymbol} in our supported tokens list.`,
//         messageId: generateMessageId()
//       }]);
//       return;
//     }

//     const promptMsgId = generateMessageId();
//     setMessages(prev => [...prev, {
//       role: "assistant",
//       content: `Would you like to earn passive income with your ${token.symbol}? I can show you some safe lending options.`,
//       messageId: promptMsgId
//     }]);
    
//     // Create a promise that resolves when user clicks a button
//     return new Promise<boolean>((resolve) => {
//       const handleConfirm = () => {
//         // First remove the passive income handlers to prevent duplicate triggers
//         setPassiveIncomeHandlers(null);
        
//         // Also clear the passive income message ID to prevent rendering options
//         setPassiveIncomeMessageId(null);
        
//         // Remove the option buttons by updating the message
//         setMessages(prev => prev.map(msg => 
//           msg.messageId === promptMsgId 
//             ? { ...msg, options: undefined } 
//             : msg
//         ));
        
//         // Then add user message and resolve
//         setMessages(prev => [
//           ...prev,
//           { 
//             role: "user", 
//             content: "Sure, show me lending options",
//             messageId: generateMessageId()
//           }
//         ]);
        
//         resolve(true);
        
//         // Immediately start looking up options with the correct token address
//         console.log('Showing lending options for token:', token.symbol, 'address:', token.address);
//         showLendingOptions(token.symbol, token.address);
//       };
      
//       const handleDecline = () => {
//         // First remove the passive income handlers to prevent duplicate triggers
//         setPassiveIncomeHandlers(null);
        
//         // Also clear the passive income message ID to prevent rendering options
//         setPassiveIncomeMessageId(null);
        
//         // Remove the option buttons by updating the message
//         setMessages(prev => prev.map(msg => 
//           msg.messageId === promptMsgId 
//             ? { ...msg, options: undefined } 
//             : msg
//         ));
        
//         // Then add user message and resolve
//         setMessages(prev => [
//           ...prev,
//           { 
//             role: "user", 
//             content: "I'm okay, thanks",
//             messageId: generateMessageId()
//           }
//         ]);
        
//         resolve(false);
        
//         setMessages(prev => [...prev, {
//           role: "assistant",
//           content: "No problem! You can always check lending options later by asking me about yield opportunities.",
//           messageId: generateMessageId()
//         }]);
//       };
      
//       setPassiveIncomeHandlers({ onConfirm: handleConfirm, onDecline: handleDecline });
//       setPassiveIncomeMessageId(promptMsgId);
      
//       // Add options to the prompt message
//       setMessages(prev => prev.map(msg => 
//         msg.messageId === promptMsgId 
//           ? {
//               ...msg,
//               options: [
//                 { platform: "Sure", type: "lend", apy: 0, riskLevel: "low", description: "Show safe lending options", url: "", tokenSymbol: token.symbol },
//                 { platform: "I'm okay, thanks", type: "lend", apy: 0, riskLevel: "low", description: "Decline lending options", url: "", tokenSymbol: token.symbol }
//               ]
//             }
//           : msg
//       ));
//     });
//   };

//   // Separate function to show lending options
//   const showLendingOptions = async (tokenSymbol: string, tokenMint: string) => {
//     console.log('showLendingOptions called with:', { tokenSymbol, tokenMint });
//     setLendingToken({ symbol: tokenSymbol, mint: tokenMint });
//     const loadingMsgId = generateMessageId();
    
//     // setMessages(prev => [...prev, {
//     //   role: "assistant",
//     //   content: `Looking up safe lending options for ${tokenSymbol}...`,
//     //   messageId: loadingMsgId
//     // }]);
    
//     try {
//       console.log('Fetching Solend pools for token:', tokenSymbol, 'mint:', tokenMint);
//       const pools = await fetchSolendPoolsByMint(tokenMint);
//       console.log('Fetched pools:', pools);
      
//       if (pools.length === 0) {
//         console.log('No pools found for token:', tokenSymbol);
//         setMessages(prev => prev.map(msg => 
//           msg.messageId === loadingMsgId 
//             ? { ...msg, content: `No safe lending pools found for ${tokenSymbol} at the moment.` }
//             : msg
//         ));
//         setSolendPools(null);
//         return;
//       }
      
//       // Replace loading message with results
//       setMessages(prev => prev.map(msg => 
//         msg.messageId === loadingMsgId 
//           ? { ...msg, content: `I found ${pools.length} lending options for ${tokenSymbol}. You can see them below.` }
//           : msg
//       ));
      
//       console.log('Setting Solend pools in state:', pools);
//       setSolendPools(pools);
//     } catch (error) {
//       console.error('Error fetching lending pools:', error);
//       setMessages(prev => prev.map(msg => 
//         msg.messageId === loadingMsgId 
//           ? { ...msg, content: `Sorry, I had trouble finding lending options for ${tokenSymbol}. Please try again later.` }
//           : msg
//       ));
//       setSolendPools(null);
//     }
//   };

//   const handleLendingAmount = (amount: number, pool: SolendPool) => {
//     setLendingAmount(amount);
//     setSelectedPool(pool);
//     setShowLendingConfirm(true);
//     // setMessages(prev => [...prev, {
//     //   role: "assistant",
//     //   content: `You're about to lend ${amount} ${pool.symbol} for ${pool.apy}% APY. Proceed?`,
//     //   messageId: generateMessageId()
//     // }]);
//   };

//   const handleLendNow = async () => {
//     // Hide lending options UI immediately when the user clicks "Lend Now"
//     setShowLendingConfirm(false);
//     setSolendPools(null); // Hide the pools UI immediately
    
//     // Add debugging to see what values we have
//     console.log('handleLendNow called with these values:');
//     console.log('lendingAmount:', lendingAmount);
//     console.log('lendingToken:', lendingToken);
//     console.log('selectedPool:', selectedPool);
//     console.log('publicKey:', publicKey?.toString());
//     console.log('isAuthenticated:', isAuthenticated);
//     console.log('walletAddress:', walletAddress);
    
//     setMessages(prev => [...prev, {
//       role: "assistant",
//       content: `Lending ${lendingAmount} ${lendingToken?.symbol} at ${selectedPool?.apy}% APY... Please approve the transaction in your wallet.`,
//       messageId: generateMessageId()
//     }]);
    
//     try {
//       // Check each value individually for better error reporting
//       if (!selectedPool) {
//         console.error('Missing selectedPool');
//         throw new Error('Missing selectedPool - Please select a lending pool');
//       }
      
//       if (!publicKey && !walletAddress) {
//         console.error('Missing publicKey/walletAddress');
//         throw new Error('Missing wallet address - Please connect your wallet');
//       }
      
//       if (!lendingAmount || lendingAmount <= 0) {
//         console.error('Invalid lendingAmount:', lendingAmount);
//         throw new Error('Please enter a valid amount to lend');
//       }
      
//       // Use either Privy wallet address or Solana wallet public key
//       const userPublicKey = walletAddress || publicKey?.toString();
      
//       // Call the API route to get the serialized transaction
//       console.log('Calling API with:', {
//         pool: selectedPool.pool,
//         amount: lendingAmount,
//         userPublicKey
//       });
      
//       const apiUrl = `${config.apiUrl}/api/solend-lend`;
//       console.log('API URL:', apiUrl);
      
//       const res = await fetch(apiUrl, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           pool: selectedPool.pool,
//           amount: lendingAmount,
//           userPublicKey
//         })
//       });
      
//       // Log the API response for debugging
//       console.log('API response status:', res.status);
      
//       const data = await res.json();
//       console.log('API response data:', data);
      
//       if (!res.ok) throw new Error(data.error || 'Failed to get transaction');
      
//       // Deserialize the transaction
//       const transaction = VersionedTransaction.deserialize(Buffer.from(data.transaction, 'base64'));
//       // Send transaction using the appropriate wallet
//       // Use Alchemy connection instead of default Solana connection
//       const connection = getAlchemyConnection();

//       // Use Privy's sendTransaction if authenticated with Privy, otherwise use Solana wallet adapter
//       let signature;
//       if (isAuthenticated && privySendTransaction) {
//         signature = await privySendTransaction(transaction, connection);
//       } else if (connected && publicKey && sendTransaction) {
//         signature = await sendTransaction(transaction, connection);
//       } else {
//         throw new Error("No wallet available to send transaction");
//       }

//       setMessages(prev => [...prev, {
//         role: "assistant",
//         content: `Successfully lent ${lendingAmount} ${lendingToken?.symbol} on Solend! Transaction signature: ${signature}. You are now earning ${selectedPool.apy}% APY.`,
//         messageId: generateMessageId()
//       }]);
//     } catch (e) {
//       console.error('Lending error:', e);
//       setMessages(prev => [...prev, {
//         role: "assistant",
//         content: `Lending failed: ${e instanceof Error ? e.message : 'Unknown error'}`,
//         messageId: generateMessageId()
//       }]);
//     } finally {
//       // Clear all lending-related state
//       setLendingAmount(null);
//       setSelectedPool(null);
//       setSolendPools(null);
//       setLendingToken(null);
//       setShowLendingConfirm(false);
//     }
//   };

//   const handleQuickAction = (action: string) => {
//     setInput(action);
//     handleSend();
//   };

//   const handleSend = async () => {
//     if (!input.trim()) return;

//     const userMessage = input;
//     setInput("");
//     setMessages(prev => [...prev, { 
//       role: "user", 
//       content: userMessage,
//       messageId: generateMessageId()
//     }]);
//     setIsTyping(true);

//     try {
//       const llmResponse = await processLLMResponse(userMessage);
      
//       // Handle different intents
//       switch (llmResponse.intent) {
//         case "buy_sol":
//           if (llmResponse.amount && llmResponse.amount > 0) {
//             await handleBuySol(llmResponse.amount);
//           } else {
//             setMessages(prev => [...prev, {
//               role: "assistant",
//               content: "Please specify a valid amount of SOL to buy.",
//               messageId: generateMessageId()
//             }]);
//           }
//           break;

//         case "buy_token":
//           if (llmResponse.amount && llmResponse.amount > 0 && llmResponse.token) {
//             await handleBuyToken(llmResponse.amount, llmResponse.token);
//           } else {
//             setMessages(prev => [...prev, {
//               role: "assistant",
//               content: "Please specify a valid amount and token to buy.",
//               messageId: generateMessageId()
//             }]);
//           }
//           break;

//         case "explore_yield": {
//           // Try to extract token symbol from user message
//           let tokenSymbol = llmResponse.token;
//           if (!tokenSymbol) {
//             tokenSymbol = extractTokenSymbolFromYieldQuery(userMessage) || undefined;
//           }
          
//           if (tokenSymbol) {
//             // Find token mint from tokenList
//             const token = tokenList.find(t => t.symbol.toUpperCase() === tokenSymbol.toUpperCase());
//             if (token) {
//               const loadingMsgId = generateMessageId();
//               setMessages(prev => [...prev, { 
//                 role: "assistant", 
//                 content: `Looking up yield options for ${token.symbol}...`,
//                 messageId: loadingMsgId
//               }]);
              
//               // Use the showLendingOptions function
//               showLendingOptions(token.symbol, token.address);
//             } else {
//               setMessages(prev => [...prev, { 
//                 role: "assistant", 
//                 content: `Token ${tokenSymbol} not found in supported list.`,
//                 messageId: generateMessageId()
//               }]);
//             }
//           } else {
//             // If no specific token is mentioned, show a list of supported tokens
//             setMessages(prev => [...prev, { 
//               role: "assistant", 
//               content: "Which token would you like to explore lending options for? Here are the supported tokens:",
//               messageId: generateMessageId(),
//               options: tokenList.map(token => ({
//                 platform: token.symbol,
//                 type: "lend",
//                 apy: 0,
//                 riskLevel: "low",
//                 description: `Explore lending options for ${token.symbol}`,
//                 url: "",
//                 tokenSymbol: token.symbol
//               }))
//             }]);
//           }
//           break;
//         }

//         case "view_portfolio":
//           // TODO: Implement portfolio view logic
//           setMessages(prev => [...prev, {
//             role: "assistant",
//             content: llmResponse.message,
//             messageId: generateMessageId()
//           }]);
//           break;

//         default:
//           setMessages(prev => [...prev, {
//             role: "assistant",
//             content: llmResponse.message,
//             messageId: generateMessageId()
//           }]);
//       }
//     } catch (error) {
//       setMessages(prev => [...prev, {
//         role: "assistant",
//         content: "I'm having trouble understanding. Please try again or use the buttons below.",
//         messageId: generateMessageId()
//       }]);
//     } finally {
//       setIsTyping(false);
//     }
//   };

//   // Update condition to check both Solana wallet adapter and Privy wallet
//   if (!connected && !isAuthenticated) {
//     return (
//       <div className="flex-1 flex items-center justify-center p-4">
//         <div className="text-center">
//           <p className="text-white mb-4">Please connect your Solana wallet to get started.</p>
//         </div>
//       </div>
//     )
//   }

//   return (
//     <div className="flex flex-col h-full">
//       {/* Messages Area */}
//       <div className="flex-1 overflow-y-auto p-4 space-y-4">
//         {messages.map((message, index) => (
//           <div
//             key={index}
//             className={cn(
//               "flex",
//               message.role === "user" ? "justify-end" : "justify-start"
//             )}
//           >
//             <div
//               className={cn(
//                 "max-w-[80%] rounded-lg p-3",
//                 message.role === "user"
//                   ? "bg-[#2C3444] text-white"
//                   : "bg-[#252C3B] text-white"
//               )}
//             >
//               <ReactMarkdown
//                 components={{
//                   a: ({ node, ...props }) => (
//                     <a 
//                       {...props} 
//                       target="_blank" 
//                       rel="noopener noreferrer"
//                       className="text-[#34C759] hover:underline"
//                     />
//                   )
//                 }}
//               >
//                 {message.content}
//               </ReactMarkdown>
//               {/* Render simple buttons for passive income prompt */}
//               {message.options &&
//                 message.options.length === 2 &&
//                 message.options[0].platform === "Sure" &&
//                 message.options[1].platform === "I'm okay, thanks" &&
//                 message.messageId === passiveIncomeMessageId && 
//                 passiveIncomeHandlers ? (
//                   <div className="flex gap-3 mt-4">
//                     <Button
//                       className="bg-[#34C759] hover:bg-[#2FB350] text-white flex-1"
//                       onClick={passiveIncomeHandlers.onConfirm}
//                     >
//                       Sure
//                     </Button>
//                     <Button
//                       variant="outline"
//                       className="border-[#34C759] text-[#34C759] flex-1"
//                       onClick={passiveIncomeHandlers.onDecline}
//                     >
//                       I'm okay, thanks
//                     </Button>
//                   </div>
//                 ) : (
//                   message.options && (
//                     <div className="mt-4 space-y-3">
//                       {message.options.map((option, i) => (
//                         <div
//                           key={i}
//                           className="bg-[#1E2533] rounded-lg p-3 border border-[#34C759]"
//                         >
//                           <div className="flex justify-between items-center mb-2">
//                             <span className="font-semibold">{option.platform}</span>
//                             <span className="text-[#34C759] text-lg font-bold">
//                               {option.apy}%
//                             </span>
//                           </div>
//                           <p className="text-sm text-gray-400 mb-2">{option.description}</p>
//                           <div className="flex justify-between items-center">
//                             <span className={cn(
//                               "text-sm",
//                               option.riskLevel === "low" && "text-green-400",
//                               option.riskLevel === "medium" && "text-yellow-400",
//                               option.riskLevel === "high" && "text-red-400"
//                             )}>
//                               {option.riskLevel.charAt(0).toUpperCase() + option.riskLevel.slice(1)} Risk
//                             </span>
//                             {option.type === 'buy' ? (
//                               <Button 
//                                 className="bg-[#34C759] hover:bg-[#2FB350] text-white text-sm"
//                                 onClick={() => window.open(option.url, '_blank')}
//                               >
//                                 Proceed to Buy
//                               </Button>
//                             ) : option.platform === option.tokenSymbol ? (
//                               <Button 
//                                 className="bg-[#34C759] hover:bg-[#2FB350] text-white text-sm"
//                                 onClick={() => {
//                                   const token = tokenList.find(t => t.symbol === option.tokenSymbol);
//                                   if (token) {
//                                     showLendingOptions(token.symbol, token.address);
//                                   }
//                                 }}
//                               >
//                                 Explore
//                               </Button>
//                             ) : (
//                               <Button 
//                                 className="bg-[#34C759] hover:bg-[#2FB350] text-white text-sm"
//                                 onClick={() => {
//                                   // Use the Solend flow instead
//                                   const token = tokenList.find(t => t.symbol === option.tokenSymbol);
//                                   if (token) {
//                                     showLendingOptions(token.symbol, token.address);
//                                   }
//                                 }}
//                               >
//                                 Lend Now
//                               </Button>
//                             )}
//                           </div>
//                         </div>
//                       ))}
//                     </div>
//                   )
//                 )}
//             </div>
//           </div>
//         ))}
//         {currentQuote && (
//           <div className="flex justify-start">
//             <div className="max-w-[80%]">
//               <QuoteWidget
//                 quote={currentQuote}
//                 onConfirm={handleConfirmPurchase}
//                 onCancel={handleCancelPurchase}
//               />
//             </div>
//           </div>
//         )}
//         {swapQuoteWidget && (
//           <div className="flex justify-start">
//             <div className="max-w-[80%]">
//               <SwapWidget
//                 quote={swapQuoteWidget}
//                 onConfirm={handleConfirmSwap}
//                 onCancel={handleCancelSwap}
//               />
//             </div>
//           </div>
//         )}
//         {solendPools && !showLendingConfirm && (
//           <div className="flex justify-start w-full">
//             <div className="bg-[#1E2533] rounded-lg p-6 border border-[#34C759] mt-4 w-full max-w-[600px] shadow-lg">
//               <div className="flex items-center justify-between mb-6">
//                 <h3 className="text-xl font-semibold text-white">Lending Options for {lendingToken?.symbol}</h3>
//               </div>
//               <div className="space-y-4">
//                 {solendPools.length > 0 ? (
//                   solendPools.map((pool, index) => (
//                     <div key={pool.mintAddress + '-' + pool.market} 
//                          className="flex items-center justify-between p-4 bg-[#252C3B] rounded-lg hover:bg-[#2C3444] transition-colors duration-200">
//                       <div className="flex items-center space-x-4">
//                         <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#1E2533] text-[#34C759] font-bold">
//                           {index + 1}
//                         </div>
//                         <div>
//                           <div className="flex items-center space-x-2">
//                             <span className="text-white font-medium text-lg">{lendingToken?.symbol}</span>
//                             <span className={cn(
//                               "text-xs px-2 py-1 rounded-full font-medium",
//                               pool.riskLevel === 'low' && "bg-green-900/50 text-green-400",
//                               pool.riskLevel === 'moderate' && "bg-yellow-900/50 text-yellow-400",
//                               pool.riskLevel === 'high' && "bg-red-900/50 text-red-400"
//                             )}>
//                               {pool.riskLevel.charAt(0).toUpperCase() + pool.riskLevel.slice(1)} Risk
//                             </span>
//                           </div>
//                           <div className="text-sm text-gray-400 mt-1">
//                             Market: {pool.market.slice(0, 6)}...{pool.market.slice(-4)}
//                           </div>
//                         </div>
//                       </div>
//                       <div className="flex items-center space-x-6">
//                         <div className="text-right">
//                           <div className="text-[#34C759] font-bold text-xl">{pool.apy.toFixed(2)}%</div>
//                           <div className="text-sm text-gray-400">APY</div>
//                         </div>
//                         <Button 
//                           size="sm" 
//                           className="bg-[#34C759] hover:bg-[#2FB350] text-white px-4 py-2 rounded-lg transition-colors duration-200"
//                           onClick={() => {
//                             setLendingAmount(null);
//                             setSelectedPool(pool);
//                             setShowLendingConfirm(true);
//                           }}
//                         >
//                           Lend
//                         </Button>
//                       </div>
//                     </div>
//                   ))
//                 ) : (
//                   <div className="text-center py-8">
//                     <div className="text-gray-400 mb-2">No lending options available at the moment.</div>
//                     <div className="text-sm text-gray-500">Please try again later or check other tokens.</div>
//                   </div>
//                 )}
//               </div>
//               <div className="mt-6 pt-4 border-t border-[#252C3B]">
//                 <div className="grid grid-cols-3 gap-4 text-sm text-gray-400">
//                   <div className="flex items-center space-x-2">
//                     <div className="w-3 h-3 rounded-full bg-green-400"></div>
//                     <span>Low Risk: 0-5% APY</span>
//                   </div>
//                   <div className="flex items-center space-x-2">
//                     <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
//                     <span>Moderate Risk: 5-15% APY</span>
//                   </div>
//                   <div className="flex items-center space-x-2">
//                     <div className="w-3 h-3 rounded-full bg-red-400"></div>
//                     <span>High Risk: 15-30% APY</span>
//                   </div>
//                 </div>
//                 <div className="mt-4 text-xs text-gray-500 text-center">
//                   * APY rates are subject to change based on market conditions
//                 </div>
//               </div>
//             </div>
//           </div>
//         )}
//         {showLendingConfirm && selectedPool !== null && (
//           <div className="bg-[#1E2533] rounded-lg p-4 border border-[#34C759] mt-4 max-w-[400px]">
//             <h3 className="text-lg font-semibold text-white mb-2">Confirm Lending</h3>
//             <p className="text-white mb-2">You're about to lend <b>{lendingToken?.symbol}</b> for <b>{selectedPool.apy}%</b> APY on Solend.</p>
//             <div className="mb-4">
//               <label className="block text-gray-300 mb-1" htmlFor="lending-amount">Amount to Lend</label>
//               <input
//                 id="lending-amount"
//                 type="number"
//                 min="0"
//                 step="any"
//                 value={lendingAmount === null ? '' : lendingAmount}
//                 onChange={e => setLendingAmount(e.target.value === '' ? null : Number(e.target.value))}
//                 className="w-full px-3 py-2 rounded bg-[#252C3B] border border-[#34C759] text-white focus:outline-none focus:ring-2 focus:ring-[#34C759]"
//                 placeholder={`Enter amount of ${lendingToken?.symbol}`}
//               />
//             </div>
//             <div className="flex gap-3 mt-4">
//               <Button
//                 className="bg-[#34C759] text-white flex-1"
//                 onClick={handleLendNow}
//                 disabled={lendingAmount === null || isNaN(lendingAmount) || lendingAmount <= 0}
//               >
//                 Lend Now
//               </Button>
//               <Button variant="outline" className="flex-1 border-[#34C759] text-[#34C759]" onClick={() => setShowLendingConfirm(false)}>Cancel</Button>
//             </div>
//           </div>
//         )}
//         {isTyping && (
//           <div className="flex justify-start">
//             <div className="bg-[#252C3B] rounded-lg p-3">
//               <div className="flex space-x-2">
//                 <div className="w-2 h-2 bg-[#34C759] rounded-full animate-bounce" />
//                 <div className="w-2 h-2 bg-[#34C759] rounded-full animate-bounce delay-100" />
//                 <div className="w-2 h-2 bg-[#34C759] rounded-full animate-bounce delay-200" />
//               </div>
//             </div>
//           </div>
//         )}
//         <div ref={messagesEndRef} />
//       </div>

//       {/* Quick Action Buttons */}
//       <div className="p-4 border-t border-[#252C3B]">
//         <div className="flex flex-wrap gap-2 mb-4">
//           <Button
//             variant="outline"
//             className="bg-[#1E2533] text-white hover:bg-[#252C3B]"
//             onClick={() => handleQuickAction("Buy 0.1 SOL")}
//           >
//             Buy SOL
//           </Button>
//           <Button
//             variant="outline"
//             className="bg-[#1E2533] text-white hover:bg-[#252C3B]"
//             onClick={() => handleQuickAction("Buy 10 USDC")}
//           >
//             Buy USDC
//           </Button>
//           <Button
//             variant="outline"
//             className="bg-[#1E2533] text-white hover:bg-[#252C3B]"
//             onClick={() => handleQuickAction("Show me lending options for USDC")}
//           >
//             Explore Lending Options
//           </Button>
//           <Button
//             variant="outline"
//             className="bg-[#1E2533] text-white hover:bg-[#252C3B]"
//             onClick={() => handleQuickAction("View my portfolio")}
//           >
//             View Portfolio
//           </Button>
//         </div>

//         {/* Input Area */}
//         <div className="flex gap-2">
//           <Input
//             value={input}
//             onChange={(e) => setInput(e.target.value)}
//             onKeyPress={(e) => e.key === "Enter" && handleSend()}
//             placeholder="Type your message..."
//             className="flex-1 bg-[#1E2533] border-[#252C3B] text-white focus:border-[#34C759]"
//           />
//           <Button
//             onClick={handleSend}
//             className="bg-[#34C759] hover:bg-[#2FB350] text-white"
//           >
//             <Send className="h-4 w-4" />
//           </Button>
//         </div>
//       </div>
//     </div>
//   )
// }
