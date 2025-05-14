import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SendIcon, Search } from "lucide-react"

interface ChatInputAreaProps {
  input: string
  onInputChange: (value: string) => void
  onSend: () => void
  onQuickAction: (action: string) => void
}

export function ChatInputArea({
  input,
  onInputChange,
  onSend,
  onQuickAction,
}: ChatInputAreaProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <div className="p-4">
      <div className="flex flex-wrap gap-2 mb-3">
        <Button
          variant="outline"
          className="bg-white text-black hover:bg-gray-100 border-input"
          onClick={() => onQuickAction("Buy 0.1 SOL")}
        >
          Buy SOL
        </Button>
        <Button
          variant="outline"
          className="bg-white text-black hover:bg-gray-100 border-input"
          onClick={() => onQuickAction("Buy 10 FAME")}
        >
          Buy FAME token
        </Button>
        <Button
          variant="outline"
          className="bg-white text-black hover:bg-gray-100 border-input"
          onClick={() => onQuickAction("Show me lending options for USDC")}
        >
          Explore Lending Options
        </Button>
      </div>
      
      <div className="flex items-center w-full">
        <div className="relative flex-1">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-purple opacity-70">
            <Search size={18} />
          </div>
          <input
            type="text"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="I want to buy 0.1 Sol"
            className="w-full border border-input rounded-lg bg-white px-12 py-2 text-md shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-white text-black"
          />
        </div>
        <Button
          onClick={onSend}
          disabled={!input.trim()}
          variant="purple"
          className="ml-3 px-4 py-2"
        >
          <SendIcon size={18} />
        </Button>
      </div>
    </div>
  )
} 
