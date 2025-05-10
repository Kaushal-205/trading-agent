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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Node backend running on port ${PORT}`)); 
