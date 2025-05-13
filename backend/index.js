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
let fundingKeypair = null;
if (FUNDING_SECRET) {
  try {
    // Try parsing as JSON array first (original format)
    if (FUNDING_SECRET.startsWith('[') && FUNDING_SECRET.endsWith(']')) {
      fundingKeypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(FUNDING_SECRET)));
    } 
    // If it's a base58 encoded private key string
    else if (FUNDING_SECRET.length === 88 || FUNDING_SECRET.length === 44) {
      // For base58 private keys (standard Solana private key format)
      try {
        // Properly import bs58 - CommonJS style
        const bs58 = require('bs58');
        console.log("BS58 library loaded:", typeof bs58, typeof bs58.decode);
        
        const decodedKey = bs58.decode(FUNDING_SECRET);
        console.log("Decoded key length:", decodedKey.length);
        fundingKeypair = Keypair.fromSecretKey(decodedKey);
        console.log("Successfully created keypair from base58 string");
      } catch (decodeErr) {
        console.error("Error decoding base58 key:", decodeErr);
        throw decodeErr;
      }
    } 
    // If it's a plain hex string
    else if (FUNDING_SECRET.match(/^[0-9a-fA-F]+$/) && FUNDING_SECRET.length === 128) {
      // For hex string format (64 bytes = 128 hex chars)
      const secretKeyBytes = Buffer.from(FUNDING_SECRET, 'hex');
      fundingKeypair = Keypair.fromSecretKey(secretKeyBytes);
      console.log("Successfully created keypair from hex string");
    } 
    else {
      console.error("Unrecognized private key format. Please provide a base58 encoded string, hex string, or JSON array");
    }
  } catch (e) {
    console.error("Failed to load funding wallet secret:", e.message);
    console.error("Please provide FUNDING_WALLET_SECRET env var as base58 string, hex string, or JSON array");
  }
}

// Log the funding wallet public key if successfully loaded
if (fundingKeypair) {
  console.log("Funding wallet loaded successfully!");
  console.log("Public Key:", fundingKeypair.publicKey.toString());
  // Check balance to ensure the wallet has funds
  const connection = new Connection(clusterApiUrl('devnet'));
  connection.getBalance(fundingKeypair.publicKey)
    .then(balance => {
      console.log(`Wallet balance: ${balance / 1e9} SOL`);
      if (balance < 100000000) {
        console.warn("WARNING: Funding wallet has less than 0.1 SOL. Transfers may fail.");
      }
    })
    .catch(err => {
      console.error("Error checking wallet balance:", err);
    });
} else {
  console.error("Failed to load funding wallet. SOL transfers will not work!");
}

// Default prices (if not defined in .env)
const PRICE_USD = process.env.PRICE_USD || 100; // $1.00 in cents
const PRICE_INR = process.env.PRICE_INR || 100; // ₹1.00 in paisa
const SOL_AMOUNT = 0.1; // Amount of SOL to transfer (fixed at 0.1 SOL)

// Helper: send SOL on devnet from funding wallet
async function sendDevnetSol(destination, lamports = 100000000 /* 0.1 SOL */) {
  if (!fundingKeypair) throw new Error("Funding wallet not configured");
  const connection = new Connection(clusterApiUrl('devnet'));
  const destPubkey = new PublicKey(destination);
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: fundingKeypair.publicKey,
      toPubkey: destPubkey,
      lamports,
    })
  );
  const signature = await sendAndConfirmTransaction(connection, tx, [fundingKeypair]);
  return signature;
}

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

    const connection = new Connection(clusterApiUrl('mainnet-beta'));
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
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
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

        try {
          // Send SOL to user wallet
          console.log(`Sending ${SOL_AMOUNT} SOL to wallet ${walletAddress}...`);
          const txSignature = await sendDevnetSol(walletAddress);
          console.log(`SOL transfer successful! TX: ${txSignature}`);
          
          // Update session status with transaction signature
          if (paymentSessions.has(session.id)) {
            const paymentSession = paymentSessions.get(session.id);
            paymentSession.status = 'sol_transferred';
            paymentSession.txSignature = txSignature;
            console.log(`Updated session ${session.id} with transaction signature`);
          }
          
          // Process refund if required
          if (refundRequired && paymentIntentId) {
            console.log(`Initiating refund for payment ${paymentIntentId}...`);
            const refund = await stripe.refunds.create({
              payment_intent: paymentIntentId,
              reason: 'requested_by_customer'
            });
            
            console.log(`Refund successful! Refund ID: ${refund.id}`);
            
            // Update session status
            if (paymentSessions.has(session.id)) {
              const paymentSession = paymentSessions.get(session.id);
              paymentSession.status = 'refunded';
              paymentSession.refundId = refund.id;
              console.log(`Updated session ${session.id} status to refunded`);
            }
          }
        } catch (error) {
          console.error('Error processing payment aftermath:', error);
          // Store error in session for debugging
          if (paymentSessions.has(session.id)) {
            const paymentSession = paymentSessions.get(session.id);
            paymentSession.status = 'error';
            paymentSession.error = error.message || 'Unknown error';
            console.error(`Updated session ${session.id} with error status:`, error.message);
          }
        }
      } else {
        console.error(`No wallet address found in session ${session.id}`);
      }
    }
  } catch (error) {
    console.error('Error processing webhook event:', error);
  }

  // Acknowledge receipt of the event
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
      return res.json(sessionData);
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
      // Even though we might not have the transaction in our cache,
      // at least return what we know from Stripe
      message: "Your SOL has been sent if payment was successful. Transaction details not available."
    });
  } catch (error) {
    console.error('Error fetching payment status:', error);
    res.status(500).json({ error: 'Failed to retrieve payment status' });
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
