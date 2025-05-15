const express = require('express');
const cors = require('cors');
const { SolendActionCore } = require('@solendprotocol/solend-sdk');
const { Connection, clusterApiUrl, PublicKey, Keypair, SystemProgram, sendAndConfirmTransaction, Transaction, VersionedTransaction } = require('@solana/web3.js');
const BN = require('bn.js');
const { Buffer } = require('buffer');
const Stripe = require('stripe');
const crypto = require('crypto');
const bs58 = require('bs58');
const fetch = require('node-fetch');

require('dotenv').config();

const app = express();
app.use(cors());

// Global JSON parser
app.use(express.json());

// Initialize Stripe
const stripe = Stripe(process.env.STRIPE_SECRET_KEY_LIVE);

// Load the funding wallet (mainnet) from env.
const FUNDING_SECRET = process.env.FUNDING_WALLET_SECRET;
console.log("FUNDING_SECRET", FUNDING_SECRET ? 'Set' : 'Not set');
let fundingKeypair = null;

try {
  if (FUNDING_SECRET) {
    const secretKey = bs58.default.decode(FUNDING_SECRET);
    fundingKeypair = Keypair.fromSecretKey(secretKey);
    console.log("Funding wallet address:", fundingKeypair.publicKey.toString());
  } else {
    console.warn("Warning: FUNDING_WALLET_SECRET not set. SOL transfers will fail.");
  }
} catch (error) {
  console.error("Error initializing funding wallet:", error);
}

// Function to get current SOL price
async function getCurrentSolPrice() {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd,inr');
    const data = await response.json();
    return {
      usd: data.solana.usd,
      inr: data.solana.inr
    };
  } catch (error) {
    console.error('Error fetching SOL price:', error);
    return null;
  }
}

// Default prices (if not defined in .env)
const PRICE_USD = process.env.PRICE_USD || 100; // $1.00 in cents
const PRICE_INR = process.env.PRICE_INR || 100; // ₹1.00 in paisa
const SOL_AMOUNT = 0.1; // Amount of SOL to transfer (fixed at 0.1 SOL)

// Store payment sessions for processing
const paymentSessions = new Map();

// Helper function to generate appropriate status messages
function getStatusMessage(sessionData) {
  switch (sessionData.status) {
    case 'created':
      return 'Your payment is being processed.';
    case 'payment_completed':
      return 'Payment received. Sending SOL to your wallet...';
    case 'sol_transferred':
      return `SOL successfully sent to your wallet! View the transaction on Solana Explorer: ${sessionData.explorerLink}`;
    case 'token_swap_completed':
      return `Tokens successfully swapped and sent to your wallet! View the transaction on Solana Explorer: ${sessionData.explorerLink}`;
    case 'error':
      return `There was an error: ${sessionData.error}`;
    default:
      return 'Processing your transaction...';
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Backend is running',
    timestamp: new Date().toISOString()
  });
});

// === 1. Create Stripe Checkout Session with country-specific pricing ===
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { walletAddress, email, country, dollarAmount, solAmount, tokenSymbol, tokenAddress, tokenAmount } = req.body;
    
    // Validate required fields
    if (!walletAddress || typeof walletAddress !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid walletAddress' });
    }

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate country code
    if (country && typeof country !== 'string' || (country && country.length !== 2)) {
      return res.status(400).json({ error: 'Invalid country code' });
    }

    // Get current SOL price
    const solPrice = await getCurrentSolPrice();
    if (!solPrice) {
      return res.status(500).json({ error: 'Unable to fetch current SOL price' });
    }

    // Determine currency and price based on country (default to USD)
    let currency = 'usd';
    let amount = PRICE_USD; // Default $1 USD (in cents)

    // If country is India, use INR
    if (country === 'IN') {
      currency = 'inr';
      amount = PRICE_INR; // ₹100 INR (in paisa)
    }

    // Handle custom amount cases
    let finalSolAmount;
    
    // Case 1: If solAmount is specified, we calculate the fiat amount needed
    if (solAmount && typeof solAmount === 'number' && solAmount > 0) {
      finalSolAmount = solAmount;
      // Convert SOL amount to fiat (in smallest currency unit - cents or paisa)
      amount = Math.round(solAmount * (currency === 'usd' ? solPrice.usd : solPrice.inr) * 100);
    } 
    // Case 2: If dollarAmount is specified, calculate SOL equivalent
    else if (dollarAmount && typeof dollarAmount === 'number' && dollarAmount > 0) {
      // Convert dollarAmount to cents for Stripe
      amount = Math.round(dollarAmount * 100);
      // Calculate SOL amount from the dollar amount
      const paymentAmount = amount / 100; // Convert cents/paisa to dollars/rupees
      finalSolAmount = currency === 'usd' 
        ? paymentAmount / solPrice.usd
        : paymentAmount / solPrice.inr;
    } 
    // Case 3: Use default values if neither is specified
    else {
      // Calculate SOL amount based on default payment amount
    const paymentAmount = amount / 100; // Convert cents/paisa to dollars/rupees
      finalSolAmount = currency === 'usd' 
      ? paymentAmount / solPrice.usd
      : paymentAmount / solPrice.inr;
    }

    // Validate amount is a positive number
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(500).json({ error: 'Invalid price configuration' });
    }

    // Validate and get URLs
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    if (!backendUrl || !frontendUrl) {
      return res.status(500).json({ error: 'Missing required URL configuration' });
    }

    // Round the finalSolAmount to 8 decimal places for precision
    finalSolAmount = parseFloat(finalSolAmount.toFixed(8));

    // Format sol amount for display with 4 decimal places
    const displaySolAmount = finalSolAmount.toFixed(4);

    // Create a unique session ID
    const uniqueSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    // Determine if this is a direct SOL purchase or a token swap
    const isTokenSwap = tokenSymbol && tokenAddress && tokenAmount;
    
    // Prepare product name and description based on purchase type
    let productName, productDescription;
    
    if (isTokenSwap) {
      productName = `${tokenSymbol} Token Purchase (via SOL)`;
      productDescription = `Buy ${tokenAmount} ${tokenSymbol} tokens using SOL on Solana Mainnet`;
    } else {
      productName = `Solana Mainnet Top-up (${displaySolAmount} SOL)`;
      productDescription = `Adds ${displaySolAmount} SOL to your Solana wallet on Mainnet`;
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: productName,
              description: productDescription
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        walletAddress,
        solAmount: finalSolAmount.toString(),
        fiatAmount: (amount / 100).toString(),
        fiatCurrency: currency,
        sessionId: uniqueSessionId,
        isTokenSwap: isTokenSwap ? 'true' : 'false',
        tokenSymbol: tokenSymbol || '',
        tokenAddress: tokenAddress || '',
        tokenAmount: tokenAmount ? tokenAmount.toString() : '',
      },
      success_url: `${backendUrl}/payment-success?amount=${finalSolAmount}&wallet=${walletAddress}&success=true&session_id=${uniqueSessionId}${isTokenSwap ? '&token_swap=true' : ''}`,
      cancel_url: `${frontendUrl}?canceled=true`,
      customer_email: email || undefined,
    });

    // Store session for later reference
    paymentSessions.set(uniqueSessionId, {
      id: uniqueSessionId,
      stripeSessionId: session.id,
      walletAddress,
      amount: session.amount_total,
      currency: session.currency,
      status: 'created',
      timestamp: new Date().toISOString(),
      solAmount: finalSolAmount,
      isTokenSwap: isTokenSwap,
      tokenSymbol: tokenSymbol || null,
      tokenAddress: tokenAddress || null,
      tokenAmount: tokenAmount || null
    });

    res.json({ 
      url: session.url, 
      solAmount: finalSolAmount,
      fiatAmount: amount / 100,
      fiatCurrency: currency,
      sessionId: uniqueSessionId,
      isTokenSwap: isTokenSwap,
      tokenSymbol: tokenSymbol || null,
      tokenAmount: tokenAmount || null
    });
  } catch (e) {
    console.error('Stripe session error:', e);
    // Don't expose internal error details to client
    res.status(500).json({ error: 'Could not create checkout session' });
  }
});

// === New endpoint to handle payment success and trigger SOL transfer ===
app.get('/payment-success', async (req, res) => {
  const { session_id, wallet, amount, token_swap } = req.query;
  
  console.log(`Payment success for session: ${session_id}, wallet: ${wallet}, amount: ${amount}, token_swap: ${token_swap}`);
  
  // Create minimal session data
  const sessionData = { 
    walletAddress: wallet || 'unknown',
    status: 'payment_completed',
    amount: amount || 0.1,
    sessionId: session_id || '',
    isTokenSwap: token_swap === 'true'
  };
  
  // Get session data if available for additional info
  if (session_id && paymentSessions.has(session_id)) {
    const storedSession = paymentSessions.get(session_id);
    sessionData.status = 'payment_completed';
    sessionData.solAmount = storedSession.solAmount;
    sessionData.isTokenSwap = storedSession.isTokenSwap;
    sessionData.tokenSymbol = storedSession.tokenSymbol;
    sessionData.tokenAddress = storedSession.tokenAddress;
    sessionData.tokenAmount = storedSession.tokenAmount;
  }
  
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  
  // Send HTML that immediately notifies parent window and closes itself
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Processing</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .success { color: #4CAF50; }
      </style>
      <script>
        // Execute immediately when page loads
        function notifyParentAndClose() {
          console.log('Attempting to close payment window...');
          try {
            if (window.opener && !window.opener.closed) {
              window.opener.postMessage({
                type: 'PAYMENT_COMPLETE',
                sessionId: '${session_id || ''}',
                walletAddress: '${wallet || ''}',
                amount: ${amount || 0.1},
                status: 'payment_completed',
                isTokenSwap: ${sessionData.isTokenSwap ? 'true' : 'false'},
                tokenSymbol: '${sessionData.tokenSymbol || ''}',
                tokenAddress: '${sessionData.tokenAddress || ''}',
                tokenAmount: ${sessionData.tokenAmount || 0}
              }, '*');
              console.log('Sent payment complete message to parent');
              
              // Close this tab immediately
              window.close();
              
              // Fallback redirect after 500ms if window.close() doesn't work
              setTimeout(function() {
                window.location.href = "${frontendUrl}";
              }, 500);
            } else {
              // If opener is not available, just redirect
              window.location.href = "${frontendUrl}";
            }
          } catch (err) {
            console.error('Error:', err);
            // Redirect on error
            window.location.href = "${frontendUrl}";
          }
        }
        
        // Call immediately without waiting for DOMContentLoaded
        notifyParentAndClose();
      </script>
    </head>
    <body>
      <h1 class="success">Payment Successful!</h1>
      <p>Redirecting to the app...</p>
    </body>
    </html>
  `);
});

// === 3. Check payment and SOL transfer status ===
app.get('/api/payment-status/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  
  console.log(`Checking payment status for session: ${sessionId}`);
  
  try {
    // First check our local cache
    if (paymentSessions.has(sessionId)) {
      const sessionData = paymentSessions.get(sessionId);
      console.log(`Found session ${sessionId} in cache:`, sessionData);
      
      // Format response with explorer link if available
      const response = {
        ...sessionData,
        explorerLink: sessionData.explorerLink || null,
        message: getStatusMessage(sessionData)
      };
      
      return res.json(response);
    }
    
    // If not in cache, try to fetch from Stripe
    console.log(`Session ${sessionId} not found in cache, checking Stripe...`);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session) {
      console.log(`Session ${sessionId} not found in Stripe`);
      return res.status(404).json({ error: 'Session not found' });
    }
    
    console.log(`Retrieved session ${sessionId} from Stripe`);
    
    // Return basic session info
    return res.json({
      id: session.id,
      status: session.status,
      amount: session.amount_total,
      currency: session.currency,
      walletAddress: session.metadata?.walletAddress || 'unknown',
      solAmount: session.metadata?.solAmount || '0.1',
      isTokenSwap: session.metadata?.isTokenSwap === 'true',
      tokenSymbol: session.metadata?.tokenSymbol,
      tokenAddress: session.metadata?.tokenAddress,
      tokenAmount: session.metadata?.tokenAmount,
      message: "Your payment was successful. Processing your transaction..."
    });
  } catch (error) {
    console.error('Error fetching payment status:', error);
    res.status(500).json({ error: 'Failed to retrieve payment status' });
  }
});

// API endpoint to transfer SOL directly to a wallet
app.post('/api/transfer-sol', async (req, res) => {
  try {
    const { walletAddress, amount = SOL_AMOUNT, sessionId, retryCount = 0 } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ 
        status: 'error', 
        error: 'Wallet address is required' 
      });
    }
    
    if (!fundingKeypair) {
      return res.status(500).json({ 
        status: 'error', 
        error: 'Funding wallet not initialized. Check FUNDING_WALLET_SECRET environment variable.' 
      });
    }
    
    // Connect to Solana
    const connection = new Connection(process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL || 'https://api.mainnet-beta.solana.com');
    
    // Verify the recipient wallet address
    let recipientPubkey;
    try {
      recipientPubkey = new PublicKey(walletAddress);
    } catch (err) {
      return res.status(400).json({ 
        status: 'error', 
        error: `Invalid wallet address: ${walletAddress}` 
      });
    }
    
    // Validate amount
    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ 
        status: 'error', 
        error: `Invalid amount: ${amount}` 
      });
    }
    
    console.log(`Sending ${amount} SOL to ${walletAddress}`);
    
    // Set up transaction with exact lamports
    const lamports = Math.round(amount * 1e9);
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fundingKeypair.publicKey,
        toPubkey: recipientPubkey,
        lamports,
      })
    );
    
    try {
      // Use longer-lasting blockhash and additional retries
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.lastValidBlockHeight = lastValidBlockHeight;
      
      // Send and confirm with retry settings
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
        [fundingKeypair],
        {
          commitment: 'confirmed',
          maxRetries: 3
        }
      );
    
    // Create explorer link
    const explorerLink = `https://solscan.io/tx/${signature}`;
      console.log(`SOL transfer successful! Transaction: ${signature}`);
      
      // Update session if available
      if (sessionId && paymentSessions.has(sessionId)) {
        const session = paymentSessions.get(sessionId);
        
        // Check if this is a token swap or direct SOL transfer
        if (session.isTokenSwap) {
          session.status = 'sol_received';
          session.solSignature = signature;
          session.solExplorerLink = explorerLink;
        } else {
          session.status = 'sol_transferred';
          session.signature = signature;
          session.explorerLink = explorerLink;
        }
        
        session.transferTimestamp = new Date().toISOString();
        session.transferredSolAmount = amount;
      }
    
    return res.status(200).json({
      status: 'success',
        transaction: signature,
      explorerLink,
        amount
      });
    } catch (txError) {
      console.error('Error sending transaction:', txError);
      
      // Only retry for certain errors
      if ((txError.message?.includes('BlockheightExceededError') || 
           txError.message?.includes('TimeoutError') || 
           txError.message?.includes('block height exceeded')) && 
           retryCount < 3) {
        console.log(`Will retry transfer automatically, attempt ${retryCount + 1}`);
        return res.status(500).json({
          status: 'error',
          error: 'Transaction failed but will be retried automatically',
          retryScheduled: true,
          retryCount: retryCount + 1
        });
      } else {
        return res.status(500).json({
          status: 'error',
          error: `Transaction failed: ${txError.message}`,
          details: txError.message
        });
      }
    }
  } catch (error) {
    console.error('Error transferring SOL:', error);
    return res.status(500).json({ 
      status: 'error', 
      error: 'Failed to transfer SOL: ' + error.message
    });
  }
});

// API endpoint to query Jupiter for swap quote
app.post('/api/get-swap-quote', async (req, res) => {
  try {
    const { inputMint = 'So11111111111111111111111111111111111111112', outputMint, amount, slippageBps = 50 } = req.body;
    
    if (!outputMint) {
      return res.status(400).json({ error: 'Output token mint address is required' });
    }
    
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }
    
    // Convert to lamports/smallest unit
    const inputAmount = Math.round(amount * 1e9);
    
    // Request quote from Jupiter API
    const jupiterQuoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${inputAmount}&slippageBps=${slippageBps}`;
    
    console.log(`Requesting Jupiter swap quote: ${jupiterQuoteUrl}`);
    
    const response = await fetch(jupiterQuoteUrl);
    const data = await response.json();
    
    if (data.error) {
      return res.status(500).json({ 
        error: 'Jupiter API error', 
        details: data.error 
      });
    }
    
    // Format the response with additional useful information
    return res.json({
      success: true,
      jupiterQuote: data,
      inputAmountSol: amount,
      outputAmountToken: parseFloat(data.outAmount) / Math.pow(10, data.outputDecimals),
      effectivePrice: (inputAmount / parseFloat(data.outAmount)).toFixed(6),
      swapLink: `https://jup.ag/swap/${inputMint}-${outputMint}?inAmount=${amount}&outAmount=${parseFloat(data.outAmount) / Math.pow(10, data.outputDecimals)}&slippage=${slippageBps / 100}`
    });
  } catch (error) {
    console.error('Error getting Jupiter swap quote:', error);
    return res.status(500).json({ error: 'Failed to get swap quote', details: error.message });
  }
});

// API endpoint to swap SOL to token via Jupiter
app.post('/api/swap-tokens', async (req, res) => {
  console.log('Swap tokens request received:', req.body);
  
  try {
    const { walletAddress, sessionId, fromToken = 'SOL', toToken, amount } = req.body;
    
    // Log request parameters
    console.log(`Processing swap request: wallet=${walletAddress}, token=${toToken}, amount=${amount}`);
    
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }
    
    if (!toToken) {
      return res.status(400).json({ error: 'Destination token address is required' });
    }
    
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }
    
    // Check if we have a funding wallet
    if (!fundingKeypair) {
      return res.status(500).json({ 
        error: 'Funding wallet not initialized. Check FUNDING_WALLET_SECRET environment variable.' 
      });
    }
    
    // Get session info if available
    let sessionInfo = null;
    if (sessionId && paymentSessions.has(sessionId)) {
      sessionInfo = paymentSessions.get(sessionId);
    }

    // USDC token address on Solana mainnet
    const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
    
    // Establish connection to Solana
    const connection = new Connection(process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL || 'https://api.mainnet-beta.solana.com');
    
    // Verify the recipient wallet address
    let recipientPubkey;
    try {
      recipientPubkey = new PublicKey(walletAddress);
    } catch (err) {
      return res.status(400).json({ 
        error: `Invalid wallet address: ${walletAddress}` 
      });
    }
    
    // Step 1: Directly swap SOL to the target token using the funding wallet
    console.log(`Using funding wallet to swap ${amount} SOL directly to ${toToken}`);
    
    // Get quote for SOL to target token
    const jupiterQuoteUrl = "https://quote-api.jup.ag/v6/quote";
    const quoteParams = new URLSearchParams({
      inputMint: "So11111111111111111111111111111111111111112", // SOL mint
      outputMint: toToken,
      amount: Math.round(amount * 1e9).toString(), // Convert to lamports
      slippageBps: "50"
    }).toString();
    
    const quoteUrl = `${jupiterQuoteUrl}?${quoteParams}`;
    console.log(`Requesting Jupiter quote: ${quoteUrl}`);
    
    // Retry mechanism for Jupiter API calls
    let quoteResponse;
    let quoteRetries = 0;
    const maxQuoteRetries = 3;
    
    while (quoteRetries < maxQuoteRetries) {
      try {
        console.log(`Jupiter quote attempt ${quoteRetries + 1}/${maxQuoteRetries}`);
        
        // Add timeout to fetch request using AbortController
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        quoteResponse = await fetch(quoteUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        console.log('Jupiter quote response status:', quoteResponse.status);
        
        if (!quoteResponse.ok) {
          const errorText = await quoteResponse.text();
          console.error('Jupiter quote API error:', errorText);
          throw new Error(`Jupiter API returned error: ${errorText}`);
        }
        
        break; // Success, exit the retry loop
      } catch (fetchError) {
        quoteRetries++;
        
        // Check if it's a timeout or network error
        const isTimeoutError = 
          fetchError.name === 'AbortError' || 
          fetchError.message?.includes('timeout') || 
          fetchError.message?.includes('ETIMEDOUT') ||
          fetchError.message?.includes('fetch failed') ||
          fetchError.code === 'ETIMEDOUT';
        
        if (isTimeoutError && quoteRetries < maxQuoteRetries) {
          // Add exponential backoff
          const backoffDelay = Math.min(1000 * Math.pow(2, quoteRetries), 8000);
          console.log(`Jupiter API timeout. Retrying in ${backoffDelay}ms (attempt ${quoteRetries}/${maxQuoteRetries})`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          continue;
        }
        
        // Max retries reached or not a timeout error
        if (quoteRetries >= maxQuoteRetries) {
          console.error(`Failed to get Jupiter quote after ${maxQuoteRetries} attempts`);
          return res.status(503).json({
            error: 'Jupiter API unavailable',
            details: 'Could not get a quote from Jupiter exchange after multiple attempts. Please try again later.',
            originalError: fetchError.message
          });
        }
        
        // For other errors
        return res.status(500).json({
          error: 'Failed to get Jupiter quote',
          details: fetchError.message
        });
      }
    }
    
    // Parse the quote data
    let quoteData;
    try {
      quoteData = await quoteResponse.json();
    } catch (parseError) {
      console.error('Error parsing Jupiter quote response:', parseError);
      return res.status(500).json({
        error: 'Failed to parse Jupiter response',
        details: parseError.message
      });
    }
    
    // Calculate output token amount
    const outputDecimals = quoteData.outputDecimals || 6;
    const outputAmount = parseFloat(quoteData.outAmount) / Math.pow(10, outputDecimals);
    const tokenSymbol = sessionInfo?.tokenSymbol || 'Token';
    
    console.log(`Quote received: ${amount} SOL ≈ ${outputAmount} ${tokenSymbol}`);
    
    // Now get the swap transaction
    const swapUrl = "https://quote-api.jup.ag/v6/swap";
    const swapRequestPayload = {
      quoteResponse: quoteData,
      userPublicKey: fundingKeypair.publicKey.toString(), // Use funding wallet as the user
      wrapUnwrapSOL: true,
      // Specify the user's wallet as the destination for swapped tokens
      destinationWallet: walletAddress
    };
    
    console.log('Requesting Jupiter swap transaction for SOL to token with direct transfer to user wallet');
    
    // Retry mechanism for Jupiter swap API calls
    let swapResponse;
    let swapRetries = 0;
    const maxSwapRetries = 3;
    
    while (swapRetries < maxSwapRetries) {
      try {
        console.log(`Jupiter swap API attempt ${swapRetries + 1}/${maxSwapRetries}`);
        
        // Add timeout to fetch request using AbortController
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        swapResponse = await fetch(swapUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(swapRequestPayload),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!swapResponse.ok) {
          const errorText = await swapResponse.text();
          console.error('Jupiter swap API error:', errorText);
          throw new Error(`Jupiter swap API returned error: ${errorText}`);
        }
        
        break; // Success, exit the retry loop
      } catch (fetchError) {
        swapRetries++;
        
        // Check if it's a timeout or network error
        const isTimeoutError = 
          fetchError.name === 'AbortError' || 
          fetchError.message?.includes('timeout') || 
          fetchError.message?.includes('ETIMEDOUT') ||
          fetchError.message?.includes('fetch failed') ||
          fetchError.code === 'ETIMEDOUT';
        
        if (isTimeoutError && swapRetries < maxSwapRetries) {
          // Add exponential backoff
          const backoffDelay = Math.min(1000 * Math.pow(2, swapRetries), 8000);
          console.log(`Jupiter swap API timeout. Retrying in ${backoffDelay}ms (attempt ${swapRetries}/${maxSwapRetries})`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          continue;
        }
        
        // Max retries reached or not a timeout error
        if (swapRetries >= maxSwapRetries) {
          console.error(`Failed to get Jupiter swap transaction after ${maxSwapRetries} attempts`);
          return res.status(503).json({
            error: 'Jupiter API unavailable',
            details: 'Could not get a swap transaction from Jupiter exchange after multiple attempts. Please try again later.',
            originalError: fetchError.message
          });
        }
        
        // For other errors
        return res.status(500).json({
          error: 'Failed to prepare Jupiter swap transaction',
          details: fetchError.message
        });
      }
    }
    
    // Parse the swap response data
    let swapResponseData;
    try {
      swapResponseData = await swapResponse.json();
    } catch (parseError) {
      console.error('Error parsing Jupiter swap response:', parseError);
      return res.status(500).json({
        error: 'Failed to parse Jupiter swap response',
        details: parseError.message
      });
    }
    
    // Execute the SOL to token swap transaction
    try {
      // Deserialize the transaction - Jupiter returns a versioned transaction
      const transactionBuffer = Buffer.from(swapResponseData.swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(transactionBuffer);
      
      // Sign and send the transaction
      console.log('Signing and sending SOL to token swap transaction with funding wallet (with direct transfer to user wallet)');
      
      // For versioned transactions, we don't need to set these manually
      // They are already embedded in the transaction
      
      // Add the funding wallet signature
      transaction.sign([fundingKeypair]);
      
      // Send and confirm the transaction with retry logic
      let swapTxId;
      let retryCount = 0;
      const maxRetries = 5;
      let swapTxStatus = 'SUCCESS'; // Default status
      
      while (retryCount < maxRetries) {
        try {
          console.log(`Attempt ${retryCount + 1} to send transaction...`);
          
          // Send transaction
          swapTxId = await connection.sendTransaction(transaction, {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
            maxRetries: 3
          });
          
          console.log(`Transaction sent with ID: ${swapTxId}, waiting for confirmation...`);
          
          // Wait for confirmation with a timeout
          try {
            const confirmation = await Promise.race([
              connection.confirmTransaction({
                signature: swapTxId,
                lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight,
                commitment: 'confirmed'
              }),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Confirmation timeout')), 60000)
              )
            ]);
            
            // Check the confirmation status
            if (confirmation.value.err) {
              throw new Error(`Transaction failed: ${confirmation.value.err}`);
            }
            
            // Transaction successful, break out of retry loop
            console.log(`SOL to token swap transaction successful! ID: ${swapTxId}`);
            console.log(`Confirmation result: ${JSON.stringify(confirmation.value)}`);
            break;
          } catch (confirmError) {
            // Special handling for timeout errors
            if (confirmError.message.includes('timeout') && swapTxId) {
              console.log(`Confirmation timeout but transaction was sent. Transaction ID: ${swapTxId}`);
              
                          // If this is our last retry, don't throw - just proceed with the transaction ID we have
            if (retryCount >= maxRetries - 1) {
              console.log(`Max retries reached but transaction is in flight. Proceeding with unconfirmed transaction: ${swapTxId}`);
              // We'll set a flag to indicate this was a timeout but transaction is in flight
              swapTxStatus = 'PENDING';
              break;
            }
            
            // Otherwise continue with retry
            retryCount++;
            const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 15000);
            console.log(`Confirmation timeout. Retrying in ${backoffDelay}ms (attempt ${retryCount}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
            continue;
          }
          
          // For other confirmation errors, rethrow
          if (swapTxId) {
            // Attach the transaction ID to the error
            confirmError.swapTxId = swapTxId;
          }
          throw confirmError;
          }
        } catch (txError) {
          retryCount++;
          
          // Check if error is a timeout or network related
          const isTimeoutError = 
            txError.message?.includes('timeout') || 
            txError.message?.includes('ETIMEDOUT') ||
            txError.message?.includes('fetch failed') ||
            txError.code === 'ETIMEDOUT';
            
          if (isTimeoutError && retryCount < maxRetries) {
            // Calculate exponential backoff delay
            const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 15000);
            console.log(`Network timeout detected. Retrying in ${backoffDelay}ms (attempt ${retryCount}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
            continue;
          }
          
          // If we've reached max retries or it's not a timeout error, rethrow
          if (retryCount >= maxRetries) {
            console.error(`Failed after ${maxRetries} attempts. Last error: ${txError.message}`);
          }
          
          // If we have a transaction ID, attach it to the error
          if (swapTxId) {
            txError.swapTxId = swapTxId;
          }
          
          throw txError;
        }
      }
      
      console.log(`Tokens have been directly sent to user wallet: ${walletAddress}`);
      
      // Update session info
      if (sessionInfo) {
        sessionInfo.swapTxId = swapTxId;
        sessionInfo.tokenAmount = outputAmount;
        sessionInfo.status = swapTxStatus === 'PENDING' ? 'pending_confirmation' : 'completed';
      }
      
      // Determine response based on transaction status
      if (swapTxStatus === 'PENDING') {
        // Transaction sent but not confirmed yet
        return res.json({
          status: 'pending',
          transactions: [
            {
              id: swapTxId,
              type: 'swap',
              status: 'PENDING',
              description: `Transaction sent: ${amount} SOL to ${outputAmount} ${tokenSymbol}. Awaiting confirmation.`,
              explorerLink: `https://solscan.io/tx/${swapTxId}`
            }
          ],
          finalToken: {
            symbol: tokenSymbol,
            mint: toToken,
            amount: outputAmount
          },
          message: `Transaction submitted but not yet confirmed due to network congestion. Your tokens should appear in your wallet soon. You can check the status on Solana Explorer.`
        });
      } else {
        // Transaction confirmed successfully
        return res.json({
          status: 'success',
          transactions: [
            {
              id: swapTxId,
              type: 'swap',
              status: 'CONFIRMED',
              description: `Swapped ${amount} SOL to ${outputAmount} ${tokenSymbol} and transferred directly to your wallet`,
              explorerLink: `https://solscan.io/tx/${swapTxId}`
            }
          ],
          finalToken: {
            symbol: tokenSymbol,
            mint: toToken,
            amount: outputAmount
          },
          message: `Successfully swapped SOL to ${tokenSymbol} and transferred to your wallet.`
        });
      }
      
    } catch (swapError) {
      console.error('Error executing SOL to token swap:', swapError);
      
      // Check if it's a network timeout error
      const isTimeoutError = 
        swapError.message?.includes('timeout') || 
        swapError.message?.includes('ETIMEDOUT') ||
        swapError.message?.includes('fetch failed') ||
        swapError.code === 'ETIMEDOUT';
      
      // Check if we have a transaction ID but couldn't confirm it (common during congestion)
      const hasUnconfirmedTx = swapError.swapTxId && isTimeoutError;
        
      if (hasUnconfirmedTx) {
        // We have a transaction ID but couldn't confirm it
        return res.status(202).json({
          status: 'pending',
          error: 'Transaction submitted but not confirmed',
          details: 'Your transaction was submitted to the Solana network, but confirmation is taking longer than expected due to network congestion.',
          message: 'Transaction submitted but awaiting confirmation. Please check your wallet in a few minutes.',
          transaction: {
            id: swapError.swapTxId,
            type: 'swap',
            status: 'PENDING',
            explorerLink: `https://solscan.io/tx/${swapError.swapTxId}`
          },
          isTimeout: true
        });
      } else if (isTimeoutError) {
        // General timeout error without a transaction ID
        return res.status(503).json({
          error: 'Network timeout while processing transaction',
          details: 'The transaction was initiated but we could not confirm its status due to network issues. Please check your wallet in a few minutes to see if tokens were received, or try again.',
          originalError: swapError.message,
          isTimeout: true
        });
      }
      
      return res.status(500).json({
        error: 'Failed to execute swap',
        details: swapError.message
      });
    }
  } catch (error) {
    console.error('Error processing token swap:', error);
    return res.status(500).json({
      error: 'Failed to process token swap',
      details: error.message
    });
  }
});

// === Solend lending integration ===
app.post('/api/solend-lend', async (req, res) => {
  try {
    // console.log('req.body', req.body);
    const { pool, amount, userPublicKey } = req.body;
    if (!pool || typeof pool !== 'object') return res.status(400).json({ error: 'Missing or invalid pool' });
    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) return res.status(400).json({ error: 'Missing or invalid amount' });
    if (!userPublicKey || typeof userPublicKey !== 'string') return res.status(400).json({ error: 'Missing or invalid userPublicKey' });

    const connection = new Connection(process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL || 'https://api.mainnet-beta.solana.com');
    const decimals = new BN(pool.reserve.liquidity.mintDecimals);
    const amountBN = new BN(amount).mul(new BN(10).pow(decimals));
    const wallet = { publicKey: new PublicKey(userPublicKey) };

    // Construct reserve object with string values as per SDK types
    const reserve = {
      address: pool.reserve.address,
      liquidityAddress: pool.reserve.liquidity.supplyPubkey,
      cTokenMint: pool.reserve.collateral.mintPubkey,
      cTokenLiquidityAddress: pool.reserve.collateral.supplyPubkey,
      pythOracle: pool.reserve.liquidity.pythOracle,
      switchboardOracle: pool.reserve.liquidity.switchboardOracle,
      mintAddress: pool.reserve.liquidity.mintPubkey,
      liquidityFeeReceiverAddress: pool.reserve.config.feeReceiver
    }

    const pool_reserve = {
      address: pool.reserve.address,
      pythOracle: pool.reserve.liquidity.pythOracle,
      switchboardOracle: pool.reserve.liquidity.switchboardOracle,
      mintAddress: pool.reserve.liquidity.mintPubkey,
      liquidityFeeReceiverAddress: pool.reserve.config.feeReceiver,
      extraOracle: pool.reserve.config.extraOracle
    }

    const pool_derived = {
      address: pool.reserve.lendingMarket,
      owner: pool.reserve.lendingMarket,
      name: null,
      authorityAddress: pool.reserve.lendingMarket,
      reserves: [pool_reserve],
    }

    const solendAction = await SolendActionCore.buildDepositTxns(
      pool_derived,
      reserve,
      connection,
      amountBN.toString(),
      wallet,
      { environment: 'production' }
    );
    console.log("after building txns")
    const versionedTxn = await solendAction.getVersionedTransaction();
    const serialized = Buffer.from(versionedTxn.serialize()).toString('base64');
    res.json({ transaction: serialized });
  } catch (e) {
    console.error('Solend lend API error:', e);
    let errorMsg = 'Unknown error';
    if (e instanceof Error) errorMsg = e.message;
    else if (typeof e === 'object') errorMsg = JSON.stringify(e);
    res.status(500).json({ error: errorMsg });
  }
});

// === 4. Simple signup: generate deterministic keypair from email ===
app.post('/api/signup', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') return res.status(400).json({ error: 'Email required' });

    // Derive seed from SHA256(email).slice(0,32)
    const hash = crypto.createHash('sha256').update(email).digest();
    const seed = Uint8Array.from(hash).slice(0, 32);
    const keypair = Keypair.fromSeed(seed);

    // For demo, we'll just send back the public key, do not expose private key
    // In production, save pubkey to DB and store secret key encrypted elsewhere

    res.json({ publicKey: keypair.publicKey.toBase58() });
  } catch (e) {
    console.error('Signup error:', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Node backend running on port ${PORT}`)); 