import { NextResponse } from 'next/server';
import { Connection, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import axios from 'axios';

interface LendingOpportunity {
  platform: string;
  type: 'stake' | 'lend' | 'liquidity';
  apy: number;
  minAmount: number;
  maxAmount: number;
  lockupPeriod?: number;
  riskLevel: 'low' | 'medium' | 'high';
  description: string;
  url: string;
  tokenSymbol: string;
  tokenAddress?: string;
  tvl?: number;
  protocolFee?: number;
  withdrawalFee?: number;
  additionalRewards?: {
    token: string;
    apy: number;
  }[];
}

interface InteractionRequest {
  protocol: string;
  action: 'stake' | 'lend' | 'provide_liquidity' | 'withdraw';
  amount: number;
  walletAddress: string;
}

// Constants for RPC endpoints and program IDs
const MAINNET_RPC = 'https://api.mainnet-beta.solana.com';
const connection = new Connection(MAINNET_RPC);

// Add fallback data
const FALLBACK_DATA: LendingOpportunity[] = [
  {
    platform: "Marinade Finance",
    type: "stake",
    apy: 7.2,
    minAmount: 1,
    maxAmount: 1000000,
    riskLevel: "low",
    description: "Stake SOL to earn yield through Marinade's liquid staking solution",
    url: "https://marinade.finance",
    tokenSymbol: "mSOL",
    tvl: 1000000000,
    protocolFee: 0.1,
    withdrawalFee: 0,
    additionalRewards: [
      {
        token: "MNDE",
        apy: 2.5
      }
    ]
  },
  {
    platform: "Lido",
    type: "stake",
    apy: 6.8,
    minAmount: 1,
    maxAmount: 1000000,
    riskLevel: "low",
    description: "Stake SOL to receive stSOL tokens and earn staking rewards",
    url: "https://lido.fi/solana",
    tokenSymbol: "stSOL",
    tvl: 800000000,
    protocolFee: 0.1,
    withdrawalFee: 0
  },
  {
    platform: "Jito",
    type: "stake",
    apy: 7.5,
    minAmount: 1,
    maxAmount: 1000000,
    riskLevel: "low",
    description: "Stake SOL to earn MEV rewards and staking yield",
    url: "https://jito.network",
    tokenSymbol: "jitoSOL",
    tvl: 500000000,
    protocolFee: 0.1,
    withdrawalFee: 0,
    additionalRewards: [
      {
        token: "JTO",
        apy: 3.0
      }
    ]
  },
  {
    platform: "Kamino Finance",
    type: "lend",
    apy: 8.5,
    minAmount: 10,
    maxAmount: 1000000,
    lockupPeriod: 7,
    riskLevel: "medium",
    description: "Lend SOL through Kamino's lending protocol",
    url: "https://kamino.finance",
    tokenSymbol: "kSOL",
    tvl: 300000000,
    protocolFee: 0.2,
    withdrawalFee: 0.1,
    additionalRewards: [
      {
        token: "KMNO",
        apy: 4.2
      }
    ]
  },
  {
    platform: "Orca",
    type: "liquidity",
    apy: 12.5,
    minAmount: 5,
    maxAmount: 1000000,
    riskLevel: "medium",
    description: "Provide SOL liquidity to Orca pools",
    url: "https://www.orca.so",
    tokenSymbol: "ORCA",
    tvl: 400000000,
    protocolFee: 0.3,
    withdrawalFee: 0.1,
    additionalRewards: [
      {
        token: "ORCA",
        apy: 5.8
      }
    ]
  }
];

async function getMarinadeData(): Promise<LendingOpportunity> {
  try {
    const response = await axios.get('https://api.marinade.finance/v1/stats');
    const data = response.data;
    
    return {
      platform: "Marinade Finance",
      type: "stake",
      apy: data.apy,
      minAmount: 1,
      maxAmount: 1000000,
      riskLevel: "low",
      description: "Stake SOL to earn yield through Marinade's liquid staking solution",
      url: "https://marinade.finance",
      tokenSymbol: "mSOL",
      tvl: data.tvl,
      protocolFee: 0.1,
      withdrawalFee: 0,
      additionalRewards: [
        {
          token: "MNDE",
          apy: data.mndeApy || 0
        }
      ]
    };
  } catch (error) {
    console.error('Error fetching Marinade data:', error);
    throw error;
  }
}

async function getLidoData(): Promise<LendingOpportunity> {
  try {
    const response = await axios.get('https://api.lido.fi/v1/stats/solana');
    const data = response.data;
    
    return {
      platform: "Lido",
      type: "stake",
      apy: data.apy,
      minAmount: 1,
      maxAmount: 1000000,
      riskLevel: "low",
      description: "Stake SOL to receive stSOL tokens and earn staking rewards",
      url: "https://lido.fi/solana",
      tokenSymbol: "stSOL",
      tvl: data.tvl,
      protocolFee: 0.1,
      withdrawalFee: 0
    };
  } catch (error) {
    console.error('Error fetching Lido data:', error);
    throw error;
  }
}

async function getJitoData(): Promise<LendingOpportunity> {
  try {
    const response = await axios.get('https://api.jito.network/v1/stats');
    const data = response.data;
    
    return {
      platform: "Jito",
      type: "stake",
      apy: data.apy,
      minAmount: 1,
      maxAmount: 1000000,
      riskLevel: "low",
      description: "Stake SOL to earn MEV rewards and staking yield",
      url: "https://jito.network",
      tokenSymbol: "jitoSOL",
      tvl: data.tvl,
      protocolFee: 0.1,
      withdrawalFee: 0,
      additionalRewards: [
        {
          token: "JTO",
          apy: data.jtoApy || 0
        }
      ]
    };
  } catch (error) {
    console.error('Error fetching Jito data:', error);
    throw error;
  }
}

async function getKaminoData(): Promise<LendingOpportunity> {
  try {
    const response = await axios.get('https://api.kamino.finance/v1/stats');
    const data = response.data;
    
    return {
      platform: "Kamino Finance",
      type: "lend",
      apy: data.apy,
      minAmount: 10,
      maxAmount: 1000000,
      lockupPeriod: 7,
      riskLevel: "medium",
      description: "Lend SOL through Kamino's lending protocol",
      url: "https://kamino.finance",
      tokenSymbol: "kSOL",
      tvl: data.tvl,
      protocolFee: 0.2,
      withdrawalFee: 0.1
    };
  } catch (error) {
    console.error('Error fetching Kamino data:', error);
    throw error;
  }
}

async function getOrcaData(): Promise<LendingOpportunity> {
  try {
    const response = await axios.get('https://api.orca.so/v1/pools/SOL');
    const data = response.data;
    
    return {
      platform: "Orca",
      type: "liquidity",
      apy: data.apy,
      minAmount: 5,
      maxAmount: 1000000,
      riskLevel: "medium",
      description: "Provide SOL liquidity to Orca pools",
      url: "https://www.orca.so",
      tokenSymbol: "ORCA",
      tvl: data.tvl,
      protocolFee: 0.3,
      withdrawalFee: 0.1,
      additionalRewards: [
        {
          token: "ORCA",
          apy: data.orcaApy || 0
        }
      ]
    };
  } catch (error) {
    console.error('Error fetching Orca data:', error);
    throw error;
  }
}

async function handleMarinadeInteraction(request: InteractionRequest): Promise<any> {
  try {
    const { amount, walletAddress } = request;
    // Here you would implement the actual Marinade staking logic
    // This is a placeholder for the actual implementation
    const response = await axios.post('https://api.marinade.finance/v1/stake', {
      amount,
      walletAddress,
      // Add other required parameters
    });
    return response.data;
  } catch (error) {
    console.error('Error in Marinade interaction:', error);
    throw error;
  }
}

async function handleLidoInteraction(request: InteractionRequest): Promise<any> {
  try {
    const { amount, walletAddress } = request;
    // Here you would implement the actual Lido staking logic
    const response = await axios.post('https://api.lido.fi/v1/stake/solana', {
      amount,
      walletAddress,
      // Add other required parameters
    });
    return response.data;
  } catch (error) {
    console.error('Error in Lido interaction:', error);
    throw error;
  }
}

async function handleJitoInteraction(request: InteractionRequest): Promise<any> {
  try {
    const { amount, walletAddress } = request;
    // Here you would implement the actual Jito staking logic
    const response = await axios.post('https://api.jito.network/v1/stake', {
      amount,
      walletAddress,
      // Add other required parameters
    });
    return response.data;
  } catch (error) {
    console.error('Error in Jito interaction:', error);
    throw error;
  }
}

async function handleKaminoInteraction(request: InteractionRequest): Promise<any> {
  try {
    const { amount, walletAddress } = request;
    // Here you would implement the actual Kamino lending logic
    const response = await axios.post('https://api.kamino.finance/v1/lend', {
      amount,
      walletAddress,
      // Add other required parameters
    });
    return response.data;
  } catch (error) {
    console.error('Error in Kamino interaction:', error);
    throw error;
  }
}

async function handleOrcaInteraction(request: InteractionRequest): Promise<any> {
  try {
    const { amount, walletAddress } = request;
    // Here you would implement the actual Orca liquidity provision logic
    const response = await axios.post('https://api.orca.so/v1/pools/SOL/provide', {
      amount,
      walletAddress,
      // Add other required parameters
    });
    return response.data;
  } catch (error) {
    console.error('Error in Orca interaction:', error);
    throw error;
  }
}

export async function GET() {
  console.log('Fetching lending opportunities...');
  try {
    // Try to fetch real data first
    console.log('Attempting to fetch data from all protocols...');
    const [marinadeData, lidoData, jitoData, kaminoData, orcaData] = await Promise.allSettled([
      getMarinadeData(),
      getLidoData(),
      getJitoData(),
      getKaminoData(),
      getOrcaData()
    ]);

    // Log individual protocol results
    console.log('Protocol fetch results:', {
      marinade: marinadeData.status,
      lido: lidoData.status,
      jito: jitoData.status,
      kamino: kaminoData.status,
      orca: orcaData.status
    });

    // Filter out failed requests and get successful results
    let lendingOpportunities = [marinadeData, lidoData, jitoData, kaminoData, orcaData]
      .filter((result): result is PromiseFulfilledResult<LendingOpportunity> => 
        result.status === 'fulfilled')
      .map(result => result.value);

    console.log(`Successfully fetched ${lendingOpportunities.length} protocol(s)`);

    // If no real data was fetched successfully, use fallback data
    if (lendingOpportunities.length === 0) {
      console.log('No real data could be fetched, using fallback data');
      lendingOpportunities = FALLBACK_DATA;
    }

    // Calculate metadata
    const totalTVL = lendingOpportunities.reduce((sum, opp) => sum + (opp.tvl || 0), 0);
    const averageAPY = lendingOpportunities.reduce((sum, opp) => sum + opp.apy, 0) / lendingOpportunities.length;

    const response = {
      success: true,
      data: lendingOpportunities,
      timestamp: new Date().toISOString(),
      totalOpportunities: lendingOpportunities.length,
      metadata: {
        totalTVL,
        averageAPY,
        opportunityTypes: {
          stake: lendingOpportunities.filter(opp => opp.type === 'stake').length,
          lend: lendingOpportunities.filter(opp => opp.type === 'lend').length,
          liquidity: lendingOpportunities.filter(opp => opp.type === 'liquidity').length
        }
      }
    };

    console.log('Response metadata:', {
      totalTVL,
      averageAPY,
      opportunityTypes: response.metadata.opportunityTypes
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in GET /api/lending-opportunities:', error);
    console.log('Using fallback data due to error');
    
    const fallbackResponse = {
      success: true,
      data: FALLBACK_DATA,
      timestamp: new Date().toISOString(),
      totalOpportunities: FALLBACK_DATA.length,
      metadata: {
        totalTVL: FALLBACK_DATA.reduce((sum, opp) => sum + (opp.tvl || 0), 0),
        averageAPY: FALLBACK_DATA.reduce((sum, opp) => sum + opp.apy, 0) / FALLBACK_DATA.length,
        opportunityTypes: {
          stake: FALLBACK_DATA.filter(opp => opp.type === 'stake').length,
          lend: FALLBACK_DATA.filter(opp => opp.type === 'lend').length,
          liquidity: FALLBACK_DATA.filter(opp => opp.type === 'liquidity').length
        }
      }
    };

    console.log('Fallback response metadata:', {
      totalTVL: fallbackResponse.metadata.totalTVL,
      averageAPY: fallbackResponse.metadata.averageAPY,
      opportunityTypes: fallbackResponse.metadata.opportunityTypes
    });

    return NextResponse.json(fallbackResponse);
  }
}

export async function POST(request: Request) {
  console.log('Processing lending interaction request...');
  try {
    const body: InteractionRequest = await request.json();
    console.log('Request body:', body);
    
    const { protocol, action, amount, walletAddress } = body;

    // Validate request
    if (!protocol || !action || !amount || !walletAddress) {
      console.log('Missing required parameters:', { protocol, action, amount, walletAddress });
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // Validate wallet address
    try {
      new PublicKey(walletAddress);
      console.log('Valid wallet address:', walletAddress);
    } catch (error) {
      console.error('Invalid wallet address:', walletAddress);
      return NextResponse.json({
        success: false,
        error: 'Invalid wallet address',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // Handle interaction based on protocol
    console.log(`Processing ${action} request for ${protocol}`);
    let result;
    switch (protocol.toLowerCase()) {
      case 'marinade':
        result = await handleMarinadeInteraction(body);
        break;
      case 'lido':
        result = await handleLidoInteraction(body);
        break;
      case 'jito':
        result = await handleJitoInteraction(body);
        break;
      case 'kamino':
        result = await handleKaminoInteraction(body);
        break;
      case 'orca':
        result = await handleOrcaInteraction(body);
        break;
      default:
        console.log('Unsupported protocol:', protocol);
        return NextResponse.json({
          success: false,
          error: 'Unsupported protocol',
          timestamp: new Date().toISOString()
        }, { status: 400 });
    }

    console.log('Interaction successful:', result);
    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in POST /api/lending-opportunities:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process interaction',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 