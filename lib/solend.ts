// import axios from 'axios';

// export interface SolendPool {
//   symbol: string;
//   mintAddress: string;
//   apy: number;
//   market: string;
//   pool: any;
//   riskLevel: 'low' | 'moderate' | 'high';
// }

// export async function fetchSolendPoolsByMint(mint: string): Promise<SolendPool[]> {
//   try {
//     console.log('Fetching Solend reserves for mint:', mint);
//     const url = 'https://api.solend.fi/v1/reserves?scope=all';
//     const { data } = await axios.get(url);
//     console.log('Received data from Solend API:', data);
    
//     const pools: SolendPool[] = [];
    
//     // Define APY thresholds for risk levels
//     const APY_THRESHOLDS = {
//       low: 5,      // 0-5% APY is considered low risk
//       moderate: 15 // 5-15% APY is considered moderate risk
//       // Above 15% is considered high risk
//     };
    
//     if (!data.results || !Array.isArray(data.results)) {
//       console.error('Invalid data format from Solend API:', data);
//       return [];
//     }
    
//     console.log('Searching for pools with mint:', mint);
    
//     for (const item of data.results) {
//       if (!item.reserve || !item.rates) {
//         console.warn('Invalid reserve item:', item);
//         continue;
//       }
      
//       const reserve = item.reserve;
//       const apy = parseFloat(item.rates.supplyInterest);
      
//       // Skip pools with extremely high APY (>30%) as they're likely high risk
//       if (apy > 30) {
//         console.log('Skipping high APY pool:', reserve.config.symbol, apy);
//         continue;
//       }
      
//       // Check if the mint address matches
//       if (reserve.liquidity && reserve.liquidity.mintPubkey === mint && apy > 0) {
//         console.log('Found matching pool for mint:', mint, 'with APY:', apy);
        
//         // Determine risk level based on APY
//         let riskLevel: 'low' | 'moderate' | 'high';
//         if (apy <= APY_THRESHOLDS.low) {
//           riskLevel = 'low';
//         } else if (apy <= APY_THRESHOLDS.moderate) {
//           riskLevel = 'moderate';
//         } else {
//           riskLevel = 'high';
//         }
        
//         const pool = {
//           symbol: reserve.config.symbol || reserve.liquidity.mintPubkey,
//           mintAddress: reserve.liquidity.mintPubkey,
//           apy,
//           market: reserve.lendingMarket,
//           pool: item,
//           riskLevel
//         };
        
//         console.log('Adding pool:', pool);
//         pools.push(pool);
//       }
//     }
    
//     // Sort pools by APY in descending order and take top 4
//     const sortedPools = pools
//       .sort((a, b) => b.apy - a.apy)
//       .slice(0, 4);
    
//     console.log('Returning sorted pools:', sortedPools);
//     return sortedPools;
//   } catch (error) {
//     console.error('Error in fetchSolendPoolsByMint:', error);
//     return [];
//   }
// } 
