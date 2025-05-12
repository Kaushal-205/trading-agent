import { Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OnrampQuote } from "./types"

interface QuoteWidgetProps {
  quote: OnrampQuote;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

export function QuoteWidget({ quote, onConfirm, onCancel, isProcessing = false }: QuoteWidgetProps) {
  return (
    <div className="bg-[#1E2533] rounded-lg p-4 border border-[#34C759] mt-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">MoonPay Purchase</h3>
        <span className="text-[#34C759] text-lg font-bold">
          {quote.outputAmount} {quote.outputCurrency}
        </span>
      </div>
      
      <div className="space-y-2 text-sm text-gray-400">
        <div className="flex justify-between">
          <span>You Pay:</span>
          <span className="text-white">${quote.inputAmount} {quote.inputCurrency}</span>
        </div>
        <div className="flex justify-between">
          <span>You Receive:</span>
          <span className="text-white">{quote.outputAmount} {quote.outputCurrency}</span>
        </div>
        <div className="flex justify-between">
          <span>Provider Fee:</span>
          <span className="text-white">${quote.fees.provider.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Network Fee:</span>
          <span className="text-white">${quote.fees.network.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Total Fees:</span>
          <span className="text-white">${quote.fees.total.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Exchange Rate:</span>
          <span className="text-white">1 {quote.inputCurrency} = {quote.exchangeRate.toFixed(6)} {quote.outputCurrency}</span>
        </div>
        <div className="flex justify-between">
          <span>Network:</span>
          <span className="text-white">Solana Devnet</span>
        </div>
        <div className="flex justify-between">
          <span>Processing Time:</span>
          <span className="text-white">{quote.estimatedProcessingTime}</span>
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        <Button
          onClick={onConfirm}
          disabled={isProcessing}
          className="flex-1 bg-[#34C759] hover:bg-[#2FB350] text-white"
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
              Proceed to Payment
            </>
          )}
        </Button>
        <Button
          onClick={onCancel}
          disabled={isProcessing}
          variant="outline"
          className="flex-1 border-[#34C759] text-[#34C759] hover:bg-[#34C759] hover:text-white"
        >
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
      </div>
    </div>
  );
} 
