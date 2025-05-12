import { VersionedTransaction } from "@solana/web3.js";

export interface Message {
  role: "user" | "assistant";
  content: string;
  options?: Array<{
    platform: string;
    type: 'lend' | 'buy';
    apy: number;
    riskLevel: "low" | "medium" | "high";
    description: string;
    url: string;
    tokenSymbol: string;
    tvl?: number;
    protocolFee?: number;
    withdrawalFee?: number;
    additionalRewards?: {
      token: string;
      apy: number;
    }[];
  }>;
  messageId?: string;
}

export interface LLMResponse {
  intent: "buy_sol" | "buy_token" | "explore_yield" | "view_portfolio" | "out_of_scope";
  amount?: number | null;
  currency?: string;
  token?: string;
  message: string;
}

export interface OnrampQuote {
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

export interface SwapQuoteWidget {
  requestId: string;
  inputToken: string;
  inputAmount: number;
  outputToken: string;
  outputAmount: number;
  priceImpact: string;
  exchangeRate: number;
}

export interface SolendPool {
  symbol: string;
  mintAddress: string;
  apy: number;
  market: string;
  pool: any;
  riskLevel: "low" | "medium" | "high";
}

export interface PassiveIncomeHandlers {
  onConfirm: () => void;
  onDecline: () => void;
} 
