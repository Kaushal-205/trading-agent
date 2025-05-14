import { cn } from "@/lib/utils"
import ReactMarkdown from 'react-markdown'
import { Message, PassiveIncomeHandlers } from "./types"
import { Button } from "@/components/ui/button"

interface ChatMessageProps {
  message: Message;
  passiveIncomeMessageId: string | null;
  passiveIncomeHandlers: PassiveIncomeHandlers | null;
  onExploreYield: (tokenSymbol: string) => void;
}

export function ChatMessage({ 
  message, 
  passiveIncomeMessageId, 
  passiveIncomeHandlers,
  onExploreYield 
}: ChatMessageProps) {
  return (
    <div
      className={cn(
        "flex w-full mb-4",
        message.role === "user" ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "rounded-lg p-4 shadow-sm",
          message.role === "user"
            ? "bg-[#2C3444] text-white max-w-[70%] rounded-tr-none"
            : "bg-[#252C3B] text-white max-w-[80%] rounded-tl-none"
        )}
      >
        <ReactMarkdown
          components={{
            a: ({ node, ...props }) => (
              <a 
                {...props} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#34C759] hover:underline"
              />
            )
          }}
        >
          {message.content}
        </ReactMarkdown>
        
        {/* Render simple buttons for passive income prompt */}
        {message.options &&
          message.options.length === 2 &&
          message.options[0].platform === "Sure" &&
          message.options[1].platform === "I'm okay, thanks" &&
          message.messageId === passiveIncomeMessageId && 
          passiveIncomeHandlers ? (
            <div className="flex gap-3 mt-4">
              <Button
                className="bg-[#34C759] hover:bg-[#2FB350] text-white flex-1"
                onClick={passiveIncomeHandlers.onConfirm}
              >
                Sure
              </Button>
              <Button
                variant="outline"
                className="border-[#34C759] text-[#34C759] flex-1 hover:bg-[#252C3B]"
                onClick={passiveIncomeHandlers.onDecline}
              >
                I'm okay, thanks
              </Button>
            </div>
          ) : (
            message.options && (
              <div className="mt-4 space-y-3">
                {message.options.map((option, i) => (
                  <div
                    key={i}
                    className="bg-[#1E2533] rounded-lg p-3 border border-[#34C759] hover:border-[#2FB350] transition-colors"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold">{option.platform}</span>
                      <span className="text-[#34C759] text-lg font-bold">
                        {option.apy}%
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mb-2">{option.description}</p>
                    <div className="flex justify-between items-center">
                      <span className={cn(
                        "text-sm",
                        option.riskLevel === "low" && "text-green-400",
                        option.riskLevel === "medium" && "text-yellow-400",
                        option.riskLevel === "high" && "text-red-400"
                      )}>
                        {option.riskLevel.charAt(0).toUpperCase() + option.riskLevel.slice(1)} Risk
                      </span>
                      {option.type === 'buy' ? (
                        <Button 
                          className="bg-[#34C759] hover:bg-[#2FB350] text-white text-sm"
                          onClick={() => window.open(option.url, '_blank')}
                        >
                          Proceed to Buy
                        </Button>
                      ) : option.platform === option.tokenSymbol ? (
                        <Button 
                          className="bg-[#34C759] hover:bg-[#2FB350] text-white text-sm"
                          onClick={() => onExploreYield(option.tokenSymbol)}
                        >
                          Explore
                        </Button>
                      ) : (
                        <Button 
                          className="bg-[#34C759] hover:bg-[#2FB350] text-white text-sm"
                          onClick={() => onExploreYield(option.tokenSymbol)}
                        >
                          Lend Now
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
      </div>
    </div>
  );
} 
