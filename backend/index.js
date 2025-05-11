const express = require('express');
const cors = require('cors');
const { SolendMarket } = require('@solendprotocol/solend-sdk');
const { Connection, clusterApiUrl, PublicKey } = require('@solana/web3.js');
const BN = require('bn.js');
const { Buffer } = require('buffer');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/solend-lend', async (req, res) => {
  try {
    console.log('req.body', req.body);
    const { pool, amount, userPublicKey } = req.body;
    if (!pool || typeof pool !== 'object') return res.status(400).json({ error: 'Missing or invalid pool' });
    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) return res.status(400).json({ error: 'Missing or invalid amount' });
    if (!userPublicKey || typeof userPublicKey !== 'string') return res.status(400).json({ error: 'Missing or invalid userPublicKey' });

    const connection = new Connection(clusterApiUrl('mainnet-beta'));
    const decimals = new BN(pool.reserve.liquidity.mintDecimals);
    const amountBN = new BN(amount).mul(new BN(10).pow(decimals));
    const wallet = { publicKey: new PublicKey(userPublicKey) };

    // Initialize Solend Market
    const market = await SolendMarket.initialize(
      connection,
      'production',
      new PublicKey(pool.reserve.lendingMarket)
    );

    // Get the reserve
    const reserve = market.reserves.find(r => r.address.toString() === pool.reserve.address);
    if (!reserve) {
      throw new Error('Reserve not found in market');
    }

    // Build deposit transaction
    const depositTx = await market.deposit({
      reserve,
      amount: amountBN,
      userPublicKey: wallet.publicKey,
    });

    const serialized = Buffer.from(depositTx.serialize()).toString('base64');
    res.json({ transaction: serialized });
  } catch (e) {
    console.error('Solend lend API error:', e);
    let errorMsg = 'Unknown error';
    if (e instanceof Error) errorMsg = e.message;
    else if (typeof e === 'object') errorMsg = JSON.stringify(e);
    res.status(500).json({ error: errorMsg });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Node backend running on port ${PORT}`));