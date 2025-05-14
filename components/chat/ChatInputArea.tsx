import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send } from "lucide-react"

interface ChatInputAreaProps {
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onQuickAction: (action: string) => void;
}

export function ChatInputArea({ 
  input, 
  onInputChange, 
  onSend, 
  onQuickAction 
}: ChatInputAreaProps) {
  return (
    <div className="p-4 w-full max-w-screen-2xl mx-auto">
      <div className="flex flex-wrap gap-2 mb-3">
        <Button
          variant="outline"
          className="bg-[#1E2533] text-white hover:bg-[#252C3B]"
          onClick={() => onQuickAction("Buy 0.1 SOL")}
        >
          Buy SOL
        </Button>
        <Button
          variant="outline"
          className="bg-[#1E2533] text-white hover:bg-[#252C3B]"
          onClick={() => onQuickAction("Buy 10 USDC")}
        >
          Buy USDC
        </Button>
        <Button
          variant="outline"
          className="bg-[#1E2533] text-white hover:bg-[#252C3B]"
          onClick={() => onQuickAction("Show me lending options for USDC")}
        >
          Explore Lending Options
        </Button>
        <Button
          variant="outline"
          className="bg-[#1E2533] text-white hover:bg-[#252C3B]"
          onClick={() => onQuickAction("View my portfolio")}
        >
          View Portfolio
        </Button>
      </div>

      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && onSend()}
          placeholder="Type your message..."
          className="flex-1 bg-[#1E2533] border-[#252C3B] text-white focus:border-[#34C759] py-6"
        />
        <Button
          onClick={onSend}
          className="bg-[#34C759] hover:bg-[#2FB350] text-white px-4"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
} 
