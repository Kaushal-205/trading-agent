import { useRef, useEffect, HTMLAttributes } from "react"
import { cn } from "@/lib/utils"
import { Message, PassiveIncomeHandlers, YieldOption, PassiveIncomeOption } from "./types"
import { Button } from "@/components/ui/button"
import ReactMarkdown from "react-markdown"

interface MessageProps extends HTMLAttributes<HTMLDivElement> {
  message: Message;
  passiveIncomeMessageId: string | null;
  passiveIncomeHandlers: PassiveIncomeHandlers | null;
  onExploreYield: (tokenSymbol: string) => void;
}

export function ChatMessage({ 
  message, 
  passiveIncomeMessageId, 
  passiveIncomeHandlers,
  onExploreYield,
  className,
  ...props 
}: MessageProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Add animation effect when new messages come in
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.opacity = '0'
      containerRef.current.style.transform = 'translateY(10px)'
      
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.style.opacity = '1'
          containerRef.current.style.transform = 'translateY(0)'
        }
      }, 10)
    }
  }, [])

  const isUserMessage = message.role === "user";
  
  // Function to check if content appears to be HTML
  const isHTML = (str: string) => {
    return /<[a-z][\s\S]*>/i.test(str);
  };

  const handlePassiveIncomeButtonClick = (action: string) => {
    if (action === 'showLendingOptions' && passiveIncomeHandlers?.onConfirm) {
      passiveIncomeHandlers.onConfirm();
    } else if (passiveIncomeHandlers?.onDecline) {
      passiveIncomeHandlers.onDecline();
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex transition-all duration-300 ease-in-out opacity-0 mb-6",
        isUserMessage ? "justify-end" : "justify-start",
        className
      )}
      {...props}
    >
      <div className={cn(
        "px-4 py-3 rounded-lg max-w-[700px] border shadow-sm",
        isUserMessage 
          ? "bg-brand-purple text-white font-medium" 
          : "bg-white border-brand-purple/20 text-black"
      )}>
        {/* Display message content */}
        <div className={isUserMessage ? "text-white" : "text-black"}>
          {isHTML(message.content) ? (
            <div dangerouslySetInnerHTML={{ __html: message.content }} />
          ) : (
            <ReactMarkdown
              components={{
                a: ({ node, ...props }) => (
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-purple hover:underline"
                    {...props}
                  />
                )
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>
        
        {/* Render passive income options if present */}
        {message.passiveIncomeOptions && message.passiveIncomeOptions.length > 0 && 
          message.messageId === passiveIncomeMessageId && (
          <div className="mt-4 flex gap-2">
            {message.passiveIncomeOptions.map((option, i) => (
              <Button 
                key={i}
                variant="purple"
                className="text-white text-sm"
                onClick={() => handlePassiveIncomeButtonClick(option.action)}
              >
                {option.choice}
              </Button>
            ))}
          </div>
        )}
        
        {/* Render yield options if present */}
        {message.options && message.options.length > 0 && (
          <div className="mt-4 space-y-3">
            {message.options.map((option, i) => (
              <div
                key={i}
                className="bg-white rounded-lg p-3 border border-brand-purple/20 hover:border-brand-purple transition-colors"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-black">{option.platform}</span>
                  {option.apy > 0 && (
                    <span className="text-brand-purple text-lg font-bold">{option.apy}%</span>
                  )}
                </div>
                <p className="text-sm text-black/70 mb-2">{option.description}</p>
                <div className="flex justify-between items-center">
                  <span className={cn(
                    "text-sm",
                    option.riskLevel === "low" && "text-brand-purple",
                    option.riskLevel === "medium" && "text-brand-purple/80",
                    option.riskLevel === "high" && "text-rose-500"
                  )}>
                    {option.riskLevel.charAt(0).toUpperCase() + option.riskLevel.slice(1)} Risk
                  </span>
                  {option.type === 'buy' ? (
                    <Button 
                      variant="purple"
                      className="text-white text-sm"
                      onClick={() => window.open(option.url, '_blank')}
                    >
                      Proceed to Buy
                    </Button>
                  ) : option.platform === option.tokenSymbol ? (
                    <Button 
                      variant="purple"
                      className="text-white text-sm"
                      onClick={() => onExploreYield(option.tokenSymbol)}
                    >
                      Explore
                    </Button>
                  ) : (
                    <Button 
                      variant="purple"
                      className="text-white text-sm"
                      onClick={() => onExploreYield(option.tokenSymbol)}
                    >
                      Lend Now
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 
