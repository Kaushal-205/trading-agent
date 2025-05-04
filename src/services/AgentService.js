// import jupiterService from './JupiterService';
import raydiumService from './RaydiumService';

class AgentService {
  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_TOGETHERAI_API_KEY;
    this.apiUrl = 'https://api.together.xyz/v1/chat/completions';
    this.conversationContext = new Map();
    this.pendingTransaction = new Map();
    
    // Predefined list of common tokens with their correct addresses
    this.commonTokens = {
      'SOL': {
        address: 'So11111111111111111111111111111111111111112',
        decimals: 9,
        symbol: 'SOL',
        name: 'Solana'
      },
      'USDC': {
        address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        decimals: 6,
        symbol: 'USDC',
        name: 'USD Coin'
      },
      'USDT': {
        address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
        decimals: 6,
        symbol: 'USDT',
        name: 'Tether USD'
      },
      'BONK': {
        address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        decimals: 5,
        symbol: 'BONK',
        name: 'Bonk'
      },
      'TRUMP': {
        address: '5v6tZ1SiAi7G8Qg4rBF1gX1KqX3FzWYQJvXJqH6XqXqX',
        decimals: 9,
        symbol: 'TRUMP',    
        name: 'Trump'
      }
    };
  }

  async getTokenSymbol(userInput) {
    try {
      const prompt = `
      You are a helpful assistant that understands cryptocurrency tokens and their variations.
      
      For the token symbol or name "${userInput}", please identify the correct token symbol from the following list:
      - SOL (Solana)
      - USDC (USD Coin)
      - USDT (Tether USD)
      - BONK (Bonk)
      - TRUMP (Trump)
      
      Return your answer in JSON format:
      {
        "symbol": "the standardized token symbol",
        "confidence": "high/medium/low",
        "reason": "brief explanation of why this is the correct token"
      }
      
      If the token is not in the list, return:
      {
        "symbol": null,
        "confidence": "low",
        "reason": "Token not found in supported list"
      }
      `;

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
          messages: [{ role: "user", content: prompt }],
          max_tokens: 200,
          temperature: 0.3,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      const tokenInfo = JSON.parse(data.choices[0].message.content);
      
      if (!tokenInfo.symbol) {
        throw new Error(`Token "${userInput}" not found in supported list`);
      }
      
      return tokenInfo.symbol;
    } catch (error) {
      console.error('Error in getTokenSymbol:', error);
      throw error;
    }
  }

  async processUserRequest(userMessage, walletAddress) {
    try {
      // Get or initialize conversation context
      const context = this.conversationContext.get(walletAddress) || {
        fromToken: null,
        toToken: null,
        amount: null
      };

      const prompt = `
      You are a Solana trading intent analyzer. Analyze the user's message and extract trading intent.
      
      User message: "${userMessage}"
      
      Extract the following information:
      1. The token they want to trade from (fromToken)
      2. The token they want to trade to (toToken)
      3. The amount they want to trade (amount)
      
      If the user doesn't specify which token to use for trading, assume they want to use SOL.
      If the user doesn't specify an amount, set it to null.
      
      Respond in JSON format:
      {
        "fromToken": "token_symbol_or_name" | null,
        "toToken": "token_symbol_or_name" | null,
        "amount": number | null,
        "message": "brief response",
        "isComplete": boolean
      }
      
      Set isComplete to true if you have all three pieces of information.
      If any information is missing, set isComplete to false and include a message asking for the missing information.
      `;

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
          messages: [{ role: "user", content: prompt }],
          max_tokens: 200,
          temperature: 0.3,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      const intentData = JSON.parse(data.choices[0].message.content);

      // Update context with new information
      Object.assign(context, intentData);
      this.conversationContext.set(walletAddress, context);

      if (intentData.isComplete) {
        try {
          // Default to SOL if fromToken is not specified
          const fromToken = intentData.fromToken || 'SOL';
          
          // Get standardized token symbols from LLM
          const fromTokenSymbol = await this.getTokenSymbol(fromToken);
          const toTokenSymbol = await this.getTokenSymbol(intentData.toToken);

          console.log('Token symbols:', { fromTokenSymbol, toTokenSymbol });

          // Execute the swap directly
          const result = await raydiumService.swap(
            fromTokenSymbol,
            toTokenSymbol,
            intentData.amount,
            'ExactIn'
          );

          return {
            type: 'success',
            message: `Swap executed successfully! You swapped ${result.details.inputAmount} ${result.details.fromToken} for ${result.details.outputAmount} ${result.details.toToken}. Transaction ID: ${result.txId}`,
            transaction: result
          };
        } catch (error) {
          console.error('Error processing swap:', error);
          return {
            type: 'error',
            message: `Failed to execute swap: ${error.message}`
          };
        }
      } else {
        return {
          type: 'incomplete',
          message: intentData.message
        };
      }
    } catch (error) {
      console.error('Error processing user request:', error);
      return {
        type: 'error',
        message: `Error processing request: ${error.message}`
      };
    }
  }
}

export default new AgentService(); 