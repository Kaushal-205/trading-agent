import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { SolendPool } from "./types"

interface SolendPoolsWidgetProps {
  pools: SolendPool[];
  tokenSymbol: string;
  onSelectPool: (pool: SolendPool) => void;
}

export function SolendPoolsWidget({ pools, tokenSymbol, onSelectPool }: SolendPoolsWidgetProps) {
  return (
    <div className="bg-[#1E2533] rounded-lg p-6 border border-[#34C759] mt-4 w-full max-w-[600px] shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-white">Lending Options for {tokenSymbol}</h3>
      </div>
      <div className="space-y-4">
        {pools.length > 0 ? (
          pools.map((pool, index) => (
            <div key={pool.mintAddress + '-' + pool.market} 
                 className="flex items-center justify-between p-4 bg-[#252C3B] rounded-lg hover:bg-[#2C3444] transition-colors duration-200">
              <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#1E2533] text-[#34C759] font-bold">
                  {index + 1}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-white font-medium text-lg">{tokenSymbol}</span>
                    <span className={cn(
                      "text-xs px-2 py-1 rounded-full font-medium",
                      pool.riskLevel === 'low' && "bg-green-900/50 text-green-400",
                      pool.riskLevel === 'medium' && "bg-yellow-900/50 text-yellow-400",
                      pool.riskLevel === 'high' && "bg-red-900/50 text-red-400"
                    )}>
                      {pool.riskLevel.charAt(0).toUpperCase() + pool.riskLevel.slice(1)} Risk
                    </span>
                  </div>
                  <div className="text-sm text-gray-400 mt-1">
                    Market: {pool.market.slice(0, 6)}...{pool.market.slice(-4)}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-6">
                <div className="text-right">
                  <div className="text-[#34C759] font-bold text-xl">{pool.apy.toFixed(2)}%</div>
                  <div className="text-sm text-gray-400">APY</div>
                </div>
                <Button 
                  size="sm" 
                  className="bg-[#34C759] hover:bg-[#2FB350] text-white px-4 py-2 rounded-lg transition-colors duration-200"
                  onClick={() => onSelectPool(pool)}
                >
                  Lend
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">No lending options available at the moment.</div>
            <div className="text-sm text-gray-500">Please try again later or check other tokens.</div>
          </div>
        )}
      </div>
      <div className="mt-6 pt-4 border-t border-[#252C3B]">
        <div className="grid grid-cols-3 gap-4 text-sm text-gray-400">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
            <span>Low Risk: 0-5% APY</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <span>Moderate Risk: 5-15% APY</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <span>High Risk: 15-30% APY</span>
          </div>
        </div>
        <div className="mt-4 text-xs text-gray-500 text-center">
          * APY rates are subject to change based on market conditions
        </div>
      </div>
    </div>
  );
} 
