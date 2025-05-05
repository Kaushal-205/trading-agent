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

  async getTokenBySymbol(symbol) {
    try {
      // Use RaydiumService's token data directly
      return await raydiumService.getTokenBySymbol(symbol);
    } catch (error) {
      console.error('Error getting token:', error);
      throw new Error(`Token "${symbol}" not found`);
    }
  }

  async processUserRequest(message) {
    try {
      const prompt = `Analyze the following message to extract trading intent. 
      The message is: "${message}"
      
      Return ONLY a JSON object with EXACTLY this structure:
      {
        "fromToken": "SOL",  // Always default to SOL if not specified
        "toToken": "token symbol",  // The token they want to buy/receive
        "amount": number,  // The amount they specified
        "amountType": "input" or "output",  // "output" for "buy X token", "input" for "swap X token"
        "isComplete": true  // Set to false only if amount is missing
      }
      
      Examples:
      - "buy 0.5 USDC" -> {"fromToken": "SOL", "toToken": "USDC", "amount": 0.5, "amountType": "output", "isComplete": true}
      - "swap 1 SOL to USDC" -> {"fromToken": "SOL", "toToken": "USDC", "amount": 1, "amountType": "input", "isComplete": true}
      - "how much USDC" -> {"fromToken": "SOL", "toToken": "USDC", "amount": null, "amountType": "input", "isComplete": false}`;

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
      const intent = JSON.parse(data.choices[0].message.content);

      if (!intent.isComplete) {
        return {
          type: 'incomplete',
          message: 'Please provide the amount for the swap.'
        };
      }

      // Get token information directly from RaydiumService
      const fromToken = await this.getTokenBySymbol(intent.fromToken);
      const toToken = await this.getTokenBySymbol(intent.toToken);

      console.log('Processing swap with intent:', {
        fromToken,
        toToken,
        amount: intent.amount,
        amountType: intent.amountType
      });

      // Execute the swap
      const result = await raydiumService.swap(
        fromToken.symbol,
        toToken.symbol,
        intent.amount,
        intent.amountType,
        50 // Default slippage
      );

      return {
        type: 'success',
        message: result.message,
        details: result.details
      };
    } catch (error) {
      console.error('Error processing request:', error);
      return {
        type: 'error',
        message: `Failed to process request: ${error.message}`
      };
    }
  }
}

export default new AgentService(); 