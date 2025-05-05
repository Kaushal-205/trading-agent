import { PublicKey, Transaction, VersionedTransaction, Connection, Keypair } from '@solana/web3.js';
import { Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Liquidity, TokenAmount, Token as RaydiumToken } from '@raydium-io/raydium-sdk';
import { BN } from '@project-serum/anchor';

/**
 * RaydiumService
 * --------------
 * Lightweight wrapper around Raydium's Trade API to fetch swap quotes.
 * Docs: https://docs.raydium.io/raydium/traders/trade-api
 */
class RaydiumService {
    constructor() {
        // Solana RPC endpoint
        this.connection = new Connection('https://api.mainnet-beta.solana.com');
        
        // Raydium program IDs
        this.AMM_PROGRAM_ID = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8');
        this.AMM_AUTHORITY = new PublicKey('5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1');
        
        // Common token addresses
        this.tokenAddresses = {
            'SOL': 'So11111111111111111111111111111111111111112',
            'USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            'USDT': 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
            'BONK': 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
            'TRUMP': '5v6tZ1SiAi7G8Qg4rBF1gX1KqX3FzWYQJvXJqH6XqXqX'
        };

        // Token decimals
        this.tokenDecimals = {
            'SOL': 9,
            'USDC': 6,
            'USDT': 6,
            'BONK': 5,
            'TRUMP': 9
        };
    }

    async getTokenBySymbol(symbol) {
        const address = this.tokenAddresses[symbol.toUpperCase()];
        if (!address) {
            throw new Error(`Token "${symbol}" not found in supported list`);
        }
        return {
            address,
            decimals: this.tokenDecimals[symbol.toUpperCase()],
            symbol: symbol.toUpperCase()
        };
    }

    async findPool(inputToken, outputToken) {
        try {
            console.log('Finding pool for tokens:', {
                inputToken: {
                    symbol: inputToken.symbol,
                    address: inputToken.address
                },
                outputToken: {
                    symbol: outputToken.symbol,
                    address: outputToken.address
                }
            });

            // Get all Raydium pools
            const pools = await Liquidity.fetchAllPoolKeys(this.connection);
            console.log('Total pools found:', pools.length);

            if (!pools || pools.length === 0) {
                throw new Error('No liquidity pools found');
            }

            // Log first few pools for debugging
            console.log('Sample pools:', pools.slice(0, 3).map(pool => ({
                baseMint: pool.baseMint.toString(),
                quoteMint: pool.quoteMint.toString()
            })));

            // Find pool that matches our token pair
            const pool = pools.find(pool => {
                try {
                    const baseMint = pool.baseMint.toString();
                    const quoteMint = pool.quoteMint.toString();
                    
                    const isMatch = (
                        (baseMint === inputToken.address && quoteMint === outputToken.address) ||
                        (baseMint === outputToken.address && quoteMint === inputToken.address)
                    );

                    if (isMatch) {
                        console.log('Found matching pool:', {
                            baseMint,
                            quoteMint,
                            inputTokenAddress: inputToken.address,
                            outputTokenAddress: outputToken.address
                        });
                    }

                    return isMatch;
                } catch (error) {
                    console.error('Error checking pool:', error);
                    return false;
                }
            });

            if (!pool) {
                console.log('No matching pool found. Available pools:', pools.map(p => ({
                    baseMint: p.baseMint.toString(),
                    quoteMint: p.quoteMint.toString()
                })));
                throw new Error(`No liquidity pool found for ${inputToken.symbol}/${outputToken.symbol} pair`);
            }

            console.log('Found matching pool:', {
                baseMint: pool.baseMint.toString(),
                quoteMint: pool.quoteMint.toString()
            });

            return pool;
        } catch (error) {
            console.error('Error finding pool:', error);
            throw new Error(`Failed to find liquidity pool: ${error.message}`);
        }
    }

    async swap(
        inputTokenSymbol,
        outputTokenSymbol,
        amount,
        amountType = 'input',
        slippageBps = 50
    ) {
        try {
            console.log('Swap request details:', {
                inputTokenSymbol,
                outputTokenSymbol,
                amount,
                amountType,
                slippageBps
            });

            // Get token information
            const inputToken = await this.getTokenBySymbol(inputTokenSymbol);
            const outputToken = await this.getTokenBySymbol(outputTokenSymbol);

            console.log('Token information:', {
                inputToken,
                outputToken
            });

            if (!inputToken || !outputToken) {
                throw new Error('Token information not found');
            }

            // Find the appropriate liquidity pool
            const pool = await this.findPool(inputToken, outputToken);

            // Get the wallet
            const wallet = window.solana || window.solflare;
            if (!wallet) {
                throw new Error('No compatible Solana wallet detected');
            }

            // Connect wallet if not already connected
            if (!wallet.isConnected) {
                await wallet.connect();
            }

            console.log('Wallet connected:', {
                publicKey: wallet.publicKey.toString()
            });

            // Create token objects for Raydium SDK
            const inputTokenObj = new RaydiumToken(
                new PublicKey(inputToken.address),
                inputToken.decimals
            );
            const outputTokenObj = new RaydiumToken(
                new PublicKey(outputToken.address),
                outputToken.decimals
            );

            // Get pool info
            const poolInfo = await Liquidity.fetchInfo({
                connection: this.connection,
                poolKeys: pool
            });

            console.log('Pool info:', {
                baseMint: pool.baseMint.toString(),
                quoteMint: pool.quoteMint.toString(),
                baseDecimals: poolInfo.baseDecimals,
                quoteDecimals: poolInfo.quoteDecimals
            });

            let swapInstruction;
            if (amountType === 'input') {
                // Convert input amount to raw units
                const amountRaw = new BN(
                    Math.floor(amount * Math.pow(10, inputToken.decimals))
                );

                console.log('Input amount calculation:', {
                    amount,
                    decimals: inputToken.decimals,
                    amountRaw: amountRaw.toString()
                });

                // Create token amount objects
                const inputAmount = new TokenAmount(inputTokenObj, amountRaw);
                
                // Calculate output amount with slippage
                const outputAmount = await Liquidity.computeOutputAmount({
                    poolKeys: pool,
                    poolInfo,
                    amountIn: inputAmount,
                    currencyOut: outputTokenObj,
                    slippage: new BN(slippageBps)
                });

                console.log('Output amount calculation:', {
                    minAmountOut: outputAmount.minAmountOut.raw.toString(),
                    amountOut: outputAmount.amountOut.raw.toString()
                });

                // Create swap instruction for exact input
                swapInstruction = await Liquidity.makeSwapInstruction({
                    poolKeys: pool,
                    userKeys: {
                        tokenAccountIn: await Token.getAssociatedTokenAddress(
                            new PublicKey(inputToken.address),
                            wallet.publicKey
                        ),
                        tokenAccountOut: await Token.getAssociatedTokenAddress(
                            new PublicKey(outputToken.address),
                            wallet.publicKey
                        ),
                        owner: wallet.publicKey
                    },
                    amountIn: inputAmount.raw,
                    minAmountOut: outputAmount.minAmountOut.raw
                });
            } else {
                // Convert output amount to raw units
                const amountRaw = new BN(
                    Math.floor(amount * Math.pow(10, outputToken.decimals))
                );

                console.log('Output amount calculation:', {
                    amount,
                    decimals: outputToken.decimals,
                    amountRaw: amountRaw.toString()
                });

                // Create token amount objects
                const outputAmount = new TokenAmount(outputTokenObj, amountRaw);
                
                // Calculate input amount with slippage
                const inputAmount = await Liquidity.computeInputAmount({
                    poolKeys: pool,
                    poolInfo,
                    amountOut: outputAmount,
                    currencyIn: inputTokenObj,
                    slippage: new BN(slippageBps)
                });

                console.log('Input amount calculation:', {
                    maxAmountIn: inputAmount.maxAmountIn.raw.toString(),
                    amountIn: inputAmount.amountIn.raw.toString()
                });

                // Create swap instruction for exact output
                swapInstruction = await Liquidity.makeSwapInstruction({
                    poolKeys: pool,
                    userKeys: {
                        tokenAccountIn: await Token.getAssociatedTokenAddress(
                            new PublicKey(inputToken.address),
                            wallet.publicKey
                        ),
                        tokenAccountOut: await Token.getAssociatedTokenAddress(
                            new PublicKey(outputToken.address),
                            wallet.publicKey
                        ),
                        owner: wallet.publicKey
                    },
                    maxAmountIn: inputAmount.maxAmountIn.raw,
                    amountOut: outputAmount.raw
                });
            }

            // Create and send transaction
            const transaction = new Transaction().add(swapInstruction);
            const { blockhash } = await this.connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = wallet.publicKey;

            console.log('Transaction created:', {
                blockhash,
                feePayer: wallet.publicKey.toString()
            });

            const signedTx = await wallet.signTransaction(transaction);
            const signature = await this.connection.sendRawTransaction(signedTx.serialize());

            console.log('Transaction sent:', {
                signature
            });

            // Wait for confirmation
            const confirmation = await this.connection.confirmTransaction(signature, { commitment: 'confirmed' });
            if (confirmation.value.err) {
                throw new Error(`Transaction failed: ${confirmation.value.err}`);
            }

            console.log('Transaction confirmed');

            return {
                txId: signature,
                status: 'success',
                message: 'Swap executed successfully',
                details: {
                    fromToken: inputToken.symbol,
                    toToken: outputToken.symbol,
                    inputAmount: amountType === 'input' ? amount : Number(inputAmount.maxAmountIn.raw) / Math.pow(10, inputToken.decimals),
                    outputAmount: amountType === 'output' ? amount : Number(outputAmount.minAmountOut.raw) / Math.pow(10, outputToken.decimals),
                    price: amountType === 'input' 
                        ? Number(outputAmount.minAmountOut.raw) / Number(inputAmount.raw) 
                        : Number(inputAmount.maxAmountIn.raw) / Number(outputAmount.raw),
                    explorerUrl: `https://solscan.io/tx/${signature}`
                }
            };
        } catch (error) {
            console.error('Error in swap:', error);
            throw new Error(`Swap failed: ${error.message}`);
        }
    }
}

export default new RaydiumService();