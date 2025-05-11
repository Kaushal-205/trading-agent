const express = require('express');
const cors = require('cors');
const { SolendActionCore } = require('@solendprotocol/solend-sdk');
const { Connection, clusterApiUrl, PublicKey } = require('@solana/web3.js');
const BN = require('bn.js');
const { Buffer } = require('buffer');

const app = express();
app.use(cors());
app.use(express.json());

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
//http://localhost:4000/api/solend-token-details?mint=So11111111111111111111111111111111111111112
// New endpoint to get Solend token details (with APY) using SDK, not HTTP API
// app.post('/api/solend-token-details', async (req, res) => {
//   try {
//     const { mint } = req.body;
//     if (!mint || typeof mint !== 'string') {
//       return res.status(400).json({ error: 'Missing or invalid mint' });
//     }

//     // 1) Solana RPC & market client
//     const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed'); // clusterApiUrl helper :contentReference[oaicite:6]{index=6}
//     const market = await SolendMarket.initialize(connection, 'production');       // init market :contentReference[oaicite:7]{index=7}

//     // 2) Load reserve & reward data
//     await market.loadReserves();  // on‑chain reserves :contentReference[oaicite:8]{index=8}
//     await market.loadRewards();   // reward APYs :contentReference[oaicite:9]{index=9}

//     // 3) Find reserve by mint
//     const reserve = market.reserves.find(r =>
//       r.config.liquidityToken.mint === mint
//     );
//     if (!reserve) {
//       return res.status(404).json({ error: 'Token mint not found in Solend reserves' });
//     }

//     // 4) Format response
//     const supply = reserve.totalSupplyAPY();
//     const borrow = reserve.totalBorrowAPY();

//     res.json({
//       mint: reserve.config.liquidityToken.mint,
//       symbol: reserve.config.liquidityToken.symbol,
//       name: reserve.config.liquidityToken.name,
//       supplyInterestApy: supply.interestAPY,
//       supplyRewardApy: supply.rewards,
//       supplyTotalApy: supply.totalAPY,
//       borrowInterestApy: borrow.interestAPY,
//       borrowRewardApy: borrow.rewards,
//       borrowTotalApy: borrow.totalAPY,
//       utilization: reserve.stats.utilizationRatio,
//       totalSupplyWads: reserve.stats.totalSupplyWads,
//       totalBorrowWads: reserve.stats.totalBorrowWads
//     });

//   } catch (err) {
//     console.error('Fetch error:', err);
//     res.status(500).json({ error: 'Internal server error', details: err.message });
//   }
// });

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Backend is running',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Node backend running on port ${PORT}`)); 
