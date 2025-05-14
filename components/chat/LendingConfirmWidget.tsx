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
    <div className="widget bg-white rounded-lg p-4 border border-brand-purple/30 mt-4 max-w-[400px]">
      <h3 className="text-lg font-semibold text-black mb-2">Confirm Lending</h3>
      <p className="text-black mb-2">You're about to lend <b>{tokenSymbol}</b> for <b>{pool.apy}%</b> APY on Solend.</p>
      <div className="mb-4">
        <label className="block text-gray-600 mb-1" htmlFor="lending-amount">Amount to Lend</label>
        <input
          id="lending-amount"
          type="number"
          min="0"
          step="any"
          value={amount === null ? '' : amount}
          onChange={e => onAmountChange(e.target.value === '' ? null : Number(e.target.value))}
          className="w-full px-3 py-2 rounded bg-white border border-brand-purple/30 text-black focus:outline-none focus:ring-2 focus:ring-brand-purple"
          placeholder={`Enter amount of ${tokenSymbol}`}
        />
      </div>
      <div className="flex gap-3 mt-4">
        <Button
          variant="purple"
          className="text-white flex-1"
          onClick={onConfirm}
          disabled={amount === null || isNaN(Number(amount)) || Number(amount) <= 0}
        >
          Lend Now
        </Button>
        <Button 
          variant="outline" 
          className="flex-1 border-brand-purple text-brand-purple bg-brand-purple/10 hover:bg-brand-purple/20" 
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
} 
