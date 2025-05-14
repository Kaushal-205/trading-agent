const express = require('express');
const cors = require('cors');
const { SolendActionCore } = require('@solendprotocol/solend-sdk');
const { Connection, clusterApiUrl, PublicKey, Keypair, SystemProgram, sendAndConfirmTransaction, Transaction } = require('@solana/web3.js');
const BN = require('bn.js');
const { Buffer } = require('buffer');
const Stripe = require('stripe');
const crypto = require('crypto');
const bs58 = require('bs58');


require('dotenv').config();

const app = express();
app.use(cors());

// Global JSON parser – stores raw body for Stripe webhook verification
app.use(express.json({
  verify: (req, res, buf) => {
    if (req.originalUrl === '/stripe/webhook') {
      req.rawBody = buf;
    }
  }
}));

// New dependencies for Stripe and Solana funding
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Load the funding wallet (devnet) from env.
const FUNDING_SECRET = process.env.FUNDING_WALLET_SECRET;
console.log("FUNDING_SECRET", FUNDING_SECRET);
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

// Default prices (if not defined in .env)
const PRICE_USD = process.env.PRICE_USD || 100; // $1.00 in cents
const PRICE_INR = process.env.PRICE_INR || 100; // ₹1.00 in paisa
const SOL_AMOUNT = 0.1; // Amount of SOL to transfer (fixed at 0.1 SOL)


// Store payment sessions for refund processing
const paymentSessions = new Map();

app.post('/api/solend-lend', async (req, res) => {
  try {
    // console.log('req.body', req.body);
    const { pool, amount, userPublicKey } = req.body;
    if (!pool || typeof pool !== 'object') return res.status(400).json({ error: 'Missing or invalid pool' });
    // if (!reserve || typeof reserve !== 'object') return res.status(400).json({ error: 'Missing or invalid reserve' });
    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) return res.status(400).json({ error: 'Missing or invalid amount' });
    if (!userPublicKey || typeof userPublicKey !== 'string') return res.status(400).json({ error: 'Missing or invalid userPublicKey' });
    // if (!reserve.liquidity || typeof reserve.liquidity.mintDecimals !== 'number') return res.status(400).json({ error: 'Missing reserve.liquidity.mintDecimals' });

    const connection = new Connection(clusterApiUrl('devnet'));
    const decimals = new BN(pool.reserve.liquidity.mintDecimals);
    const amountBN = new BN(amount).mul(new BN(10).pow(decimals));
    const wallet = { publicKey: new PublicKey(userPublicKey) };

    // Construct reserve object with string values as per SDK types
    // console.log('pool.reserve', pool.reserve);
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
    console.log('solendAction', solendAction);
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
    const { walletAddress, email, country } = req.body;
    if (!walletAddress || typeof walletAddress !== 'string') {
      return res.status(400).json({ error: 'Missing walletAddress' });
    }

    // Determine currency and price based on country (default to USD)
    let currency = 'usd';
    let amount = PRICE_USD; // Default $1 USD (in cents)

    // If country is India, use INR
    if (country === 'IN') {
      currency = 'inr';
      amount = PRICE_INR; // ₹100 INR (in paisa)
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: 'Solana Devnet Top-up (0.1 SOL)',
              description: 'Adds 0.1 SOL to your Solana wallet on Devnet. Payment will be refunded after successful transfer.'
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        walletAddress,
        solAmount: SOL_AMOUNT.toString(),
        refundRequired: 'true' // Flag to indicate refund is required after SOL transfer
      },
      success_url: `${process.env.BACKEND_URL || 'http://localhost:4000'}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment-cancelled`,
      customer_email: email || undefined,
    });

    // Store session for later reference during webhook processing
    paymentSessions.set(session.id, {
      id: session.id,
      walletAddress,
      amount: session.amount_total,
      currency: session.currency,
      status: 'created',
      timestamp: new Date().toISOString(),
      solAmount: SOL_AMOUNT
    });

    res.json({ url: session.url });
  } catch (e) {
    console.error('Stripe session error:', e);
    res.status(500).json({ error: 'Could not create checkout session' });
  }
});

// === New endpoint to close tab after successful payment ===
app.get('/payment-success', (req, res) => {
  const { session_id } = req.query;
  
  // Get session data if available
  const sessionData = paymentSessions.get(session_id) || { 
    walletAddress: 'unknown',
    status: 'unknown'
  };
  
  // Send HTML with JavaScript to close the tab and message the parent window
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Successful</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .success { color: #4CAF50; }
      </style>
    </head>
    <body>
      <h1 class="success">Payment Successful!</h1>
      <p>Your payment was processed successfully. This window will close automatically.</p>
      <p>Session ID: ${session_id || 'Unknown'}</p>
      <script>
        // Send message to parent window with payment success info
        function notifyParentWindow() {
          try {
            if (window.opener && !window.opener.closed) {
              window.opener.postMessage({
                type: 'PAYMENT_COMPLETE',
                sessionId: '${session_id || ''}',
                walletAddress: '${sessionData.walletAddress || ''}',
                status: '${sessionData.status || 'completed'}'
              }, '*');
              console.log('Sent payment complete message to parent');
            }
          } catch (err) {
            console.error('Error sending message to parent:', err);
          }
        }
        
        // Notify parent window immediately
        notifyParentWindow();
        
        // Close the tab after 2 seconds
        setTimeout(function() {
          window.close();
          // If window.close() doesn't work (depends on browser security settings)
          // we can redirect back to the main app
          setTimeout(function() {
            window.location.href = "${process.env.FRONTEND_URL || 'http://localhost:3000'}";
          }, 1000);
        }, 2000);
      </script>
    </body>
    </html>
  `);
});

// === 2. Stripe Webhook to fund wallet and initiate refund ===
app.post('/stripe/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    // Use raw body from verify step
    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Process the event
  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const walletAddress = session.metadata?.walletAddress;
      const refundRequired = session.metadata?.refundRequired === 'true';
      const paymentIntentId = session.payment_intent;
      
      console.log(`Processing payment for session ${session.id}, wallet: ${walletAddress}`);
      
      if (walletAddress) {
        // Update session status
        if (paymentSessions.has(session.id)) {
          const paymentSession = paymentSessions.get(session.id);
          paymentSession.status = 'payment_completed';
          paymentSession.paymentIntentId = paymentIntentId;
          console.log(`Updated session ${session.id} status to payment_completed`);
        } else {
          // Create session if it doesn't exist
          console.log(`Creating new session record for ${session.id}`);
          paymentSessions.set(session.id, {
            id: session.id,
            walletAddress,
            amount: session.amount_total,
            currency: session.currency,
            status: 'payment_completed',
            paymentIntentId,
            timestamp: new Date().toISOString(),
            solAmount: SOL_AMOUNT
          });
        }

        // Process SOL transfer asynchronously (don't wait in webhook response)
        processSolTransfer(session.id, walletAddress, paymentIntentId, refundRequired)
          .catch(error => {
            console.error(`Async error processing SOL transfer for session ${session.id}:`, error);
          });
      } else {
        console.error(`No wallet address found in session ${session.id}`);
      }
    }
  } catch (error) {
    console.error('Error processing webhook event:', error);
  }

  // Acknowledge receipt of the event immediately
  res.json({ received: true });
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
    
    console.log(`Retrieved session ${sessionId} from Stripe:`, {
      id: session.id,
      status: session.status,
      customer: session.customer,
      paymentIntent: session.payment_intent,
    });
    
    // Check if we have any payments matching this session
    let paymentIntent = null;
    if (session.payment_intent) {
      try {
        paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent);
        console.log(`Found payment intent ${session.payment_intent}, status: ${paymentIntent.status}`);
      } catch (err) {
        console.error(`Error retrieving payment intent ${session.payment_intent}:`, err);
      }
    }
    
    // Return the session data we have from Stripe
    return res.json({
      id: session.id,
      status: session.status,
      amount: session.amount_total,
      currency: session.currency,
      walletAddress: session.metadata?.walletAddress || 'unknown',
      solAmount: session.metadata?.solAmount || '0.1',
      paymentStatus: paymentIntent?.status || 'unknown',
      message: "Your SOL has been sent if payment was successful. Transaction details not available."
    });
  } catch (error) {
    console.error('Error fetching payment status:', error);
    res.status(500).json({ error: 'Failed to retrieve payment status' });
  }
});

// Process Solana transfer after successful payment
async function processSolTransfer(sessionId, walletAddress, paymentIntentId, refundRequired) {
  console.log(`Processing SOL transfer for session ${sessionId} to wallet ${walletAddress}`);
  
  if (!fundingKeypair) {
    const error = "Funding wallet not initialized. Check FUNDING_WALLET_SECRET environment variable.";
    console.error(error);
    
    // Update session with error
    if (paymentSessions.has(sessionId)) {
      const session = paymentSessions.get(sessionId);
      session.status = 'error';
      session.error = error;
    }
    return;
  }
  
  try {
    // Connect to Solana
    const connection = new Connection(clusterApiUrl('devnet'));
    
    // Verify the recipient wallet address
    let recipientPubkey;
    try {
      recipientPubkey = new PublicKey(walletAddress);
    } catch (err) {
      throw new Error(`Invalid wallet address: ${walletAddress}`);
    }
    
    // Create a transfer transaction
    const solAmount = SOL_AMOUNT;
    const lamports = solAmount * 1000000000; // Convert SOL to lamports
    
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fundingKeypair.publicKey,
        toPubkey: recipientPubkey,
        lamports,
      })
    );
    
    // Send and confirm the transaction
    console.log(`Sending ${solAmount} SOL to ${walletAddress}`);
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [fundingKeypair]
    );
    
    console.log(`SOL transfer successful! Transaction signature: ${signature}`);
    
    // Create explorer link
    const explorerLink = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
    
    // Update session status
    if (paymentSessions.has(sessionId)) {
      const session = paymentSessions.get(sessionId);
      session.status = 'sol_transferred';
      session.signature = signature;
      session.explorerLink = explorerLink;
      session.transferTimestamp = new Date().toISOString();
    }
    
    // Process refund if required
    if (refundRequired && paymentIntentId) {
      try {
        // Create a refund
        console.log(`Initiating refund for payment ${paymentIntentId}`);
        const refund = await stripe.refunds.create({
          payment_intent: paymentIntentId,
          reason: 'requested_by_customer',
        });
        
        // Update session with refund info
        if (paymentSessions.has(sessionId)) {
          const session = paymentSessions.get(sessionId);
          session.status = 'refunded';
          session.refundId = refund.id;
          session.refundTimestamp = new Date().toISOString();
        }
        
        console.log(`Refund successfully processed: ${refund.id}`);
      } catch (refundError) {
        console.error(`Error processing refund for payment ${paymentIntentId}:`, refundError);
        
        // Still mark session with error but keep SOL transfer data
        if (paymentSessions.has(sessionId)) {
          const session = paymentSessions.get(sessionId);
          session.refundError = refundError.message;
        }
      }
    }
    
    return signature;
  } catch (error) {
    console.error(`Error processing SOL transfer for session ${sessionId}:`, error);
    
    // Update session with error
    if (paymentSessions.has(sessionId)) {
      const session = paymentSessions.get(sessionId);
      session.status = 'error';
      session.error = error.message;
    }
    
    throw error;
  }
}

// Helper function to generate appropriate status messages
function getStatusMessage(sessionData) {
  switch (sessionData.status) {
    case 'created':
      return 'Your payment is being processed.';
    case 'payment_completed':
      return 'Payment received. Sending SOL to your wallet...';
    case 'sol_transferred':
      return `SOL successfully sent to your wallet! View the transaction on Solana Explorer: ${sessionData.explorerLink}`;
    case 'refunded':
      return 'Transaction complete! Your payment has been refunded.';
    case 'error':
      return `There was an error: ${sessionData.error}`;
    default:
      return 'Processing your transaction...';
  }
}

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

// Add new endpoint to get wallet SOL balance
app.get('/api/sol-balance', async (req, res) => {
  try {
    console.log('req.query', req.query);
    const { walletAddress } = req.query;
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    // Connect to Solana devnet
    const connection = new Connection(clusterApiUrl('devnet'));
    
    // Get the current balance
    let publicKey;
    try {
      publicKey = new PublicKey(walletAddress);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }
    
    const balance = await connection.getBalance(publicKey);
    const solBalance = balance / 1000000000; // Convert lamports to SOL
    
    res.json({ 
      walletAddress, 
      balance: solBalance,
      lamports: balance
    });
  } catch (error) {
    console.error('Error fetching SOL balance:', error);
    res.status(500).json({ error: 'Failed to fetch wallet balance' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Node backend running on port ${PORT}`)); 
