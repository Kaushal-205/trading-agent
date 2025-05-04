// import { Connection, PublicKey } from '@solana/web3.js';

// class JupiterService {
//   constructor() {
//     this.connection = new Connection('https://api.mainnet-beta.solana.com');
//     this.tokenMap = new Map();
//     this.SOL_ADDRESS = new PublicKey('So11111111111111111111111111111111111111112');
    
//     // Known tokens with their addresses
//     this.knownTokens = {
//       'SOL': {
//         address: this.SOL_ADDRESS,
//         decimals: 9,
//         symbol: 'SOL'
//       },
//       'USDC': {
//         address: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
//         decimals: 6,
//         symbol: 'USDC'
//       },
//       'USDT': {
//         address: new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'),
//         decimals: 6,
//         symbol: 'USDT'
//       },
//       'BONK': {
//         address: new PublicKey('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'),
//         decimals: 5,
//         symbol: 'BONK'
//       },
//       'TRUMP': {
//         address: new PublicKey('6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN'),
//         decimals: 6,
//         symbol: 'TRUMP'
//       }
//     };
//   }

//   async initialize() {
//     try {
//       console.log('Initializing token map...');
//       const response = await fetch('https://lite-api.jup.ag/tokens');
//       const tokens = await response.json();
//       console.log('Fetched tokens:', tokens.length);
      
//       // Store tokens by both address and symbol
//       tokens.forEach(token => {
//         const tokenInfo = {
//           address: new PublicKey(token.address),
//           decimals: token.decimals,
//           symbol: token.symbol
//         };
//         this.tokenMap.set(token.address, tokenInfo);
//         this.tokenMap.set(token.symbol, tokenInfo);
//       });

//       // Add known tokens to the map
//       Object.entries(this.knownTokens).forEach(([symbol, token]) => {
//         this.tokenMap.set(token.address.toString(), token);
//         this.tokenMap.set(symbol, token);
//       });
      
//       console.log('Token map initialized with known tokens:', Object.keys(this.knownTokens));
//     } catch (error) {
//       console.error('Error initializing token map:', error);
//       throw new Error('Failed to initialize token map');
//     }
//   }

//   async getTokenBySymbol(symbol) {
//     if (this.tokenMap.size === 0) {
//       await this.initialize();
//     }

//     const upperSymbol = symbol.toUpperCase();
//     console.log('Looking up token by symbol:', upperSymbol);
    
//     // First check known tokens
//     if (this.knownTokens[upperSymbol]) {
//       console.log('Found token in known tokens:', this.knownTokens[upperSymbol]);
//       return this.knownTokens[upperSymbol];
//     }

//     // Then check the token map
//     const token = this.tokenMap.get(upperSymbol);
//     if (!token) {
//       console.log('Available tokens:', Array.from(this.tokenMap.keys()));
//       throw new Error(`Token ${symbol} not found`);
//     }
    
//     console.log('Found token in map:', token);
//     return token;
//   }

//   async getTokenByAddress(address) {
//     if (this.tokenMap.size === 0) {
//       await this.initialize();
//     }

//     console.log('Looking up token by address:', address);
//     const token = this.tokenMap.get(address);
//     if (!token) {
//       throw new Error(`Token with address ${address} not found`);
//     }
    
//     console.log('Found token:', token);
//     return token;
//   }

//   async getQuote(inputTokenSymbol, outputTokenSymbol, amountInTokenUnits, swapMode = 'ExactIn') {
//     try {
//       // Ensure token symbols are strings
//       const inputSymbol = String(inputTokenSymbol);
//       const outputSymbol = String(outputTokenSymbol);
      
//       console.log('Getting quote for:', {
//         inputTokenSymbol: inputSymbol,
//         outputTokenSymbol: outputSymbol,
//         amountInTokenUnits,
//         swapMode
//       });

//       const inputToken = await this.getTokenBySymbol(inputSymbol);
//       const outputToken = await this.getTokenBySymbol(outputSymbol);
      
//       console.log('Token info:', {
//         inputToken,
//         outputToken
//       });

//       let amountInSmallestUnits;
//       if (swapMode === 'ExactIn') {
//         amountInSmallestUnits = Math.floor(amountInTokenUnits * Math.pow(10, inputToken.decimals));
//       } else { // ExactOut
//         amountInSmallestUnits = Math.floor(amountInTokenUnits * Math.pow(10, outputToken.decimals));
//       }
      
//       console.log('Requesting quote with params:', {
//         inputMint: inputToken.address.toString(),
//         outputMint: outputToken.address.toString(),
//         amount: amountInSmallestUnits,
//         swapMode
//       });

//       const quoteUrl = new URL('https://lite-api.jup.ag/quote');
//       quoteUrl.searchParams.append('inputMint', inputToken.address.toString());
//       quoteUrl.searchParams.append('outputMint', outputToken.address.toString());
//       quoteUrl.searchParams.append('amount', amountInSmallestUnits.toString());
//       // Only include swapMode if it's not the default 'ExactIn'
//       if (swapMode && swapMode !== 'ExactIn') {
//         quoteUrl.searchParams.append('swapMode', swapMode);
//       }
//       // Removed parameters that could restrict routing: slippageBps, onlyDirectRoutes, asLegacyTransaction, platformFeeBps, feeAccount, computeUnitPriceMicroLamports

//       console.log('Quote URL:', quoteUrl.toString());

//       const quoteResponse = await fetch(quoteUrl.toString(), {
//         method: 'GET',
//         headers: {
//           'Accept': 'application/json',
//         }
//       });

//       console.log('Quote response status:', quoteResponse.status);

//       if (!quoteResponse.ok) {
//         const errorText = await quoteResponse.text();
//         console.error('Quote API error response:', errorText);
//         throw new Error(`Failed to fetch quote: ${errorText}`);
//       }

//       const quote = await quoteResponse.json();
//       console.log('Quote received:', quote);

//       // Calculate amounts in token units for user display
//       const inputAmount = Number(quote.inAmount) / Math.pow(10, inputToken.decimals);
//       const outputAmount = Number(quote.outAmount) / Math.pow(10, outputToken.decimals);

//       // Format message based on swap mode
//       const message = swapMode === 'ExactIn'
//         ? `By selling ${inputAmount.toFixed(4)} ${inputSymbol}, you will receive approximately ${outputAmount.toFixed(4)} ${outputSymbol}.`
//         : `To buy ${outputAmount.toFixed(4)} ${outputSymbol}, you need to spend approximately ${inputAmount.toFixed(4)} ${inputSymbol}.`;

//       return {
//         inputToken,
//         outputToken,
//         amountInTokenUnits,
//         swapMode,
//         quote,
//         message,
//         inputAmount,
//         outputAmount
//       };
//     } catch (error) {
//       console.error('Error getting quote:', error);
//       throw new Error(`Failed to get quote: ${error.message}`);
//     }
//   }

//   async getTokenInfo(mintAddress) {
//     try {
//       await this.initialize();
//       return this.tokenMap.find(token => token.address === mintAddress);
//     } catch (error) {
//       console.error('Error fetching token info:', error);
//       throw error;
//     }
//   }
// }

// const jupiterService = new JupiterService();
// export default jupiterService;