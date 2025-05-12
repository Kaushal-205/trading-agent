import { SolendPool } from './types';
import { getAlchemyConnection } from './utils';
import { PublicKey, VersionedTransaction } from '@solana/web3.js';
import config from '../../lib/config';
import axios from 'axios';

export async function fetchSolendPoolsByMint(mint: string): Promise<SolendPool[]> {
  try {
    console.log('Fetching Solend reserves for mint:', mint);
    const url = 'https://api.solend.fi/v1/reserves?scope=all';
    const { data } = await axios.get(url);
    console.log('Received data from Solend API:', data);
    
    const pools: SolendPool[] = [];
    
    // Define APY thresholds for risk levels
    const APY_THRESHOLDS = {
      low: 5,      // 0-5% APY is considered low risk
      moderate: 15 // 5-15% APY is considered moderate risk
      // Above 15% is considered high risk
    };
    
    if (!data.results || !Array.isArray(data.results)) {
      console.error('Invalid data format from Solend API:', data);
      return [];
    }
    
    console.log('Searching for pools with mint:', mint);
    
    for (const item of data.results) {
      if (!item.reserve || !item.rates) {
        console.warn('Invalid reserve item:', item);
        continue;
      }
      
      const reserve = item.reserve;
      const apy = parseFloat(item.rates.supplyInterest);
      
      // Skip pools with extremely high APY (>30%) as they're likely high risk
      if (apy > 30) {
        console.log('Skipping high APY pool:', reserve.config.symbol, apy);
        continue;
      }
      
      // Check if the mint address matches
      if (reserve.liquidity && reserve.liquidity.mintPubkey === mint && apy > 0) {
        console.log('Found matching pool for mint:', mint, 'with APY:', apy);
        
        // Determine risk level based on APY
        let riskLevel: 'low' | 'medium' | 'high';
        if (apy <= APY_THRESHOLDS.low) {
          riskLevel = 'low';
        } else if (apy <= APY_THRESHOLDS.moderate) {
          riskLevel = 'medium';
        } else {
          riskLevel = 'high';
        }
        
        const pool = {
          symbol: reserve.config.symbol || reserve.liquidity.mintPubkey,
          mintAddress: reserve.liquidity.mintPubkey,
          apy,
          market: reserve.lendingMarket,
          pool: item,
          riskLevel
        };
        
        console.log('Adding pool:', pool);
        pools.push(pool);
      }
    }
    
    // Sort pools by APY in descending order and take top 4
    const sortedPools = pools
      .sort((a, b) => b.apy - a.apy)
      .slice(0, 4);
    
    console.log('Returning sorted pools:', sortedPools);
    return sortedPools;
  } catch (error) {
    console.error('Error in fetchSolendPoolsByMint:', error);
    // Fallback to API route if direct fetch fails
    return fetchSolendPoolsFromAPI(mint);
  }
}

// Fallback method using the API route
async function fetchSolendPoolsFromAPI(tokenMint: string): Promise<SolendPool[]> {
  try {
    console.log('Falling back to API route for Solend pools. Token mint:', tokenMint);
    const response = await fetch(`${config.apiUrl}/api/solend-pools?mint=${tokenMint}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Solend pools: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Received Solend pools data from API:', data);
    return data.pools || [];
  } catch (error) {
    console.error('Error fetching Solend pools from API:', error);
    return [];
  }
}

export async function submitSolendLend(
  pool: string,
  amount: number,
  userPublicKey: string,
  sendTransaction: (transaction: VersionedTransaction) => Promise<string>
): Promise<string> {
  try {
    console.log('Submitting Solend lending transaction:', {
      pool,
      amount,
      userPublicKey
    });
    
    // Call the API route to get the serialized transaction
    const apiUrl = `${config.apiUrl}/api/solend-lend`;
    console.log('API URL:', apiUrl);
    
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pool,
        amount,
        userPublicKey
      })
    });
    
    // Log the API response for debugging
    console.log('API response status:', res.status);
    
    const data = await res.json();
    console.log('API response data:', data);
    
    if (!res.ok) throw new Error(data.error || 'Failed to get transaction');
    
    // Deserialize the transaction
    const transaction = VersionedTransaction.deserialize(Buffer.from(data.transaction, 'base64'));
    
    // Send transaction using the appropriate wallet
    // Use Alchemy connection instead of default Solana connection
    const connection = getAlchemyConnection();
    
    // Send the transaction using the callback
    const signature = await sendTransaction(transaction);
    
    return signature;
  } catch (error) {
    console.error('Error in submitSolendLend:', error);
    throw error;
  }
} 
