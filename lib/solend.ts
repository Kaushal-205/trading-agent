import axios from 'axios';

export interface SolendPool {
  symbol: string;
  mintAddress: string;
  apy: number;
  market: string;
  pool: any;
}

export async function fetchSolendPoolsByMint(mint: string): Promise<SolendPool[]> {
  const url = 'https://api.solend.fi/v1/reserves?scope=all';
  const { data } = await axios.get(url);
  const pools: SolendPool[] = [];
  for (const item of data.results) {
    const reserve = item.reserve;
    const apy = parseFloat(item.rates.supplyInterest);
    if (reserve.liquidity.mintPubkey === mint && apy > 0) {
      pools.push({
        symbol: reserve.config.symbol || reserve.liquidity.mintPubkey,
        mintAddress: reserve.liquidity.mintPubkey,
        apy,
        market: reserve.lendingMarket,
        pool: item,
      });
    }
  }
  return pools;
} 
