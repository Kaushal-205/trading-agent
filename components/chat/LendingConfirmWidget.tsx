import { Button } from "@/components/ui/button"
import { SolendPool } from "./types"

interface LendingConfirmWidgetProps {
  tokenSymbol: string;
  pool: SolendPool;
  amount: number | null;
  onAmountChange: (amount: number | null) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function LendingConfirmWidget({ 
  tokenSymbol,
  pool,
  amount,
  onAmountChange,
  onConfirm,
  onCancel
}: LendingConfirmWidgetProps) {
  return (
    <div className="bg-[#1E2533] rounded-lg p-4 border border-[#34C759] mt-4 max-w-[400px]">
      <h3 className="text-lg font-semibold text-white mb-2">Confirm Lending</h3>
      <p className="text-white mb-2">You're about to lend <b>{tokenSymbol}</b> for <b>{pool.apy}%</b> APY on Solend.</p>
      <div className="mb-4">
        <label className="block text-gray-300 mb-1" htmlFor="lending-amount">Amount to Lend</label>
        <input
          id="lending-amount"
          type="number"
          min="0"
          step="any"
          value={amount === null ? '' : amount}
          onChange={e => onAmountChange(e.target.value === '' ? null : Number(e.target.value))}
          className="w-full px-3 py-2 rounded bg-[#252C3B] border border-[#34C759] text-white focus:outline-none focus:ring-2 focus:ring-[#34C759]"
          placeholder={`Enter amount of ${tokenSymbol}`}
        />
      </div>
      <div className="flex gap-3 mt-4">
        <Button
          className="bg-[#34C759] text-white flex-1"
          onClick={onConfirm}
          disabled={amount === null || isNaN(Number(amount)) || Number(amount) <= 0}
        >
          Lend Now
        </Button>
        <Button 
          variant="outline" 
          className="flex-1 border-[#34C759] text-[#34C759]" 
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
} 
