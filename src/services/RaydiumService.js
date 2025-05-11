// import { PublicKey, Transaction, VersionedTransaction, Connection } from '@solana/web3.js';

// /**
//  * RaydiumService
//  * --------------
//  * Lightweight wrapper around Raydium's Trade API to fetch swap quotes.
//  * Docs: https://docs.raydium.io/raydium/traders/trade-api
//  */
// class RaydiumService {
//     constructor() {
//         // Base endpoint for Raydium's trade compute API
//         this.baseUrl = 'https://transaction-v1.raydium.io/compute';
//         // Solana RPC endpoint (consider using a dedicated provider like QuickNode for production)
//         this.connection = new Connection('https://api.mainnet-beta.solana.com');
//         // Jupiter token list API
//         this.tokenListUrl = 'https://token.jup.ag/all';
        
//         // Initialize token map
//         this.tokenMap = new Map();
//         this.initializeTokenMap();

//         this.commonTokens = {
//             'SOL': {
//                 address: 'So11111111111111111111111111111111111111112',
//                 decimals: 9,
//                 symbol: 'SOL',
//                 name: 'Solana'
//             },
//             'USDC': {
//                 address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
//                 decimals: 6,
//                 symbol: 'USDC',
//                 name: 'USD Coin'
//             },
//             'USDT': {
//                 address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
//                 decimals: 6,
//                 symbol: 'USDT',
//                 name: 'Tether USD'
//             },
//             'BONK': {
//                 address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
//                 decimals: 5,
//                 symbol: 'BONK',
//                 name: 'Bonk'
//             },
//             'TRUMP': {
//                 address: '5v6tZ1SiAi7G8Qg4rBF1gX1KqX3FzWYQJvXJqH6XqXqX',
//                 decimals: 9,
//                 symbol: 'TRUMP',    
//                 name: 'Trump'
//             }
//         };
//     }

//     async initializeTokenMap() {
//         try {
//             const response = await fetch(this.tokenListUrl);
//             if (!response.ok) {
//                 throw new Error(`Failed to fetch token list: ${response.statusText}`);
//             }

//             const tokens = await response.json();
            
//             // Create a map of token symbols to their information
//             tokens.forEach(token => {
//                 this.tokenMap.set(token.symbol.toUpperCase(), {
//                     address: token.address,
//                     decimals: token.decimals,
//                     symbol: token.symbol,
//                     name: token.name
//                 });
//             });

//             console.log('[Raydium] Token map initialized with', this.tokenMap.size, 'tokens');
//         } catch (error) {
//             console.error('[Raydium] Error initializing token map:', error);
//             // Fallback to common tokens if API fails
//             this.tokenMap = new Map(Object.entries(this.commonTokens));
//         }
//     }

//     async getTokenBySymbol(symbol) {
//         // Wait for token map to be initialized
//         if (this.tokenMap.size === 0) {
//             await this.initializeTokenMap();
//         }

//         const tokenInfo = this.tokenMap.get(symbol.toUpperCase());
//         if (!tokenInfo) {
//             throw new Error(`Token "${symbol}" not found in token list`);
//         }
//         return tokenInfo;
//     }

//     async swap(
//         inputTokenSymbol,
//         outputTokenSymbol,
//         amountInTokenUnits,
//         swapMode = 'ExactIn',
//         slippageBps = 50,
//         computeUnitPriceMicroLamports = 100000
//     ) {
//         try {
//             // Get token information from the token map
//             const inputTokenInfo = await this.getTokenBySymbol(inputTokenSymbol);
//             const outputTokenInfo = await this.getTokenBySymbol(outputTokenSymbol);

//             if (!inputTokenInfo || !outputTokenInfo) {
//                 throw new Error('Token information not found');
//             }

//             // Convert to smallest units (integer)
//             const amountRaw = Math.floor(
//                 amountInTokenUnits * Math.pow(10, swapMode === 'ExactIn' ? inputTokenInfo.decimals : outputTokenInfo.decimals)
//             );

//             const endpoint =
//                 swapMode === 'ExactIn' ? `${this.baseUrl}/swap-base-in` : `${this.baseUrl}/swap-base-out`;

//             const url = new URL(endpoint);
//             url.searchParams.append('inputMint', inputTokenInfo.address);
//             url.searchParams.append('outputMint', outputTokenInfo.address);
//             url.searchParams.append('amount', amountRaw.toString());
//             url.searchParams.append('slippageBps', slippageBps.toString());
//             url.searchParams.append('txVersion', 'V0'); // Use versioned transactions
//             url.searchParams.append('computeUnitPriceMicroLamports', computeUnitPriceMicroLamports.toString());

//             console.log('[Raydium] Swap URL:', url.toString());

//             const response = await fetch(url.toString(), {
//                 method: 'GET',
//                 headers: {
//                     'Accept': 'application/json'
//                 }
//             });

//             if (!response.ok) {
//                 const errorText = await response.text();
//                 throw new Error(`Raydium API error ${response.status}: ${errorText}`);
//             }

//             const data = await response.json();
//             console.log('[Raydium] Swap response:', data);

//             if (!data.transaction) {
//                 throw new Error('No transaction data received from Raydium API');
//             }

//             // Get the wallet from the global window object
//             const wallet = window.solana || window.solflare;
//             if (!wallet) {
//                 throw new Error('No compatible Solana wallet detected. Please install a wallet like Phantom or Solflare.');
//             }

//             // Connect to wallet if not already connected
//             if (!wallet.isConnected) {
//                 await wallet.connect();
//             }

//             // Create transaction from the swap data
//             const transactionData = Buffer.from(data.transaction, 'base64');
//             if (!transactionData || transactionData.length === 0) {
//                 throw new Error('Invalid transaction data received from Raydium API');
//             }

//             // Handle both legacy and versioned transactions
//             const transaction = data.txVersion === 'V0' ? VersionedTransaction.deserialize(transactionData) : Transaction.from(transactionData);

//             // Sign and send the transaction
//             const signedTx = await wallet.signTransaction(transaction);
//             const signature = await this.connection.sendRawTransaction(signedTx.serialize());

//             // Wait for confirmation
//             const confirmation = await this.connection.confirmTransaction(signature, { commitment: 'confirmed' });
//             if (confirmation.value.err) {
//                 throw new Error(`Transaction failed: ${confirmation.value.err}`);
//             }

//             // Calculate amounts in token units
//             const inAmount = amountRaw / Math.pow(10, inputTokenInfo.decimals);
//             const outAmountRaw = BigInt(data.outAmount ?? data.data?.outAmount ?? 0);
//             const outAmount = Number(outAmountRaw) / Math.pow(10, outputTokenInfo.decimals);

//             return {
//                 txId: signature,
//                 status: 'success',
//                 message: 'Swap executed successfully',
//                 details: {
//                     fromToken: inputTokenInfo.symbol,
//                     toToken: outputTokenInfo.symbol,
//                     inputAmount: inAmount,
//                     outputAmount: outAmount,
//                     price: outAmount / inAmount,
//                     priceImpact: data.priceImpact,
//                     explorerUrl: `https://solscan.io/tx/${signature}`
//                 }
//             };
//         } catch (error) {
//             console.error('Error in swap:', error);
//             throw new Error(`Swap failed: ${error.message}`);
//         }
//     }
// }

// export default new RaydiumService();