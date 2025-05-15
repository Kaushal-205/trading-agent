import { Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SwapQuoteWidget } from "./types"

interface SwapWidgetProps {
  quote: SwapQuoteWidget;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

export function SwapWidget({ quote, onConfirm, onCancel, isProcessing = false }: SwapWidgetProps) {
  return (
    <div className="widget bg-white rounded-lg p-4 border border-brand-purple/30 mt-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-black">Raydium Swap</h3>
        <span className="text-brand-purple text-lg font-bold">
          {quote.outputAmount} {quote.outputToken}
        </span>
      </div>
      
      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex justify-between">
          <span className="text-gray-800 font-medium">You Pay:</span>
          <span className="text-black">{quote.inputAmount.toFixed(4)} {quote.inputToken}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-800 font-medium">You Receive:</span>
          <span className="text-black">{quote.outputAmount.toFixed(6)} {quote.outputToken}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-800 font-medium">Price Impact:</span>
          <span className="text-black">{quote.priceImpact}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-800 font-medium">Exchange Rate:</span>
          <span className="text-black">1 {quote.inputToken} = {quote.exchangeRate.toFixed(6)} {quote.outputToken}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-800 font-medium">Network:</span>
          <span className="text-black">Solana Mainnet</span>
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        <Button
          onClick={onConfirm}
          disabled={isProcessing}
          variant="purple"
          className="flex-1 text-white"
        >
          {isProcessing ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Confirm Swap
            </>
          )}
        </Button>
        <Button
          onClick={onCancel}
          disabled={isProcessing}
          variant="outline"
          className="flex-1 border-brand-purple text-brand-purple bg-brand-purple/10 hover:bg-brand-purple/20"
        >
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
      </div>
    </div>
  );
} 
