"use client"

import { useState, useRef, useEffect } from "react"
import { Send, ArrowRight } from "lucide-react"
import { useWallet } from "@solana/wallet-adapter-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface Message {
  role: "user" | "assistant"
  content: string
  options?: Array<{
    protocol: string
    apy: number
    risk: "low" | "medium" | "high"
  }>
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I can help you buy SOL, explore yield options, or check your portfolio. What would you like to do?"
    }
  ])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { connected } = useWallet()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage = input
    setInput("")
    setMessages(prev => [...prev, { role: "user", content: userMessage }])
    setIsTyping(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage })
      })

      const data = await response.json()
      
      if (data.intent === "explore_yield") {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: data.message,
          options: data.options
        }])
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: data.message }])
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "I'm having trouble understanding. Please try again or use the buttons below."
      }])
    } finally {
      setIsTyping(false)
    }
  }

  const handleQuickAction = (action: string) => {
    setInput(action)
    handleSend()
  }

  if (!connected) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-white mb-4">Please connect your Solana wallet to get started.</p>
          <Button className="bg-[#34C759] hover:bg-[#2FB350] text-white">
            Connect Wallet
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={cn(
              "flex",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-lg p-3",
                message.role === "user"
                  ? "bg-[#2C3444] text-white"
                  : "bg-[#252C3B] text-white"
              )}
            >
              <p>{message.content}</p>
              {message.options && (
                <div className="mt-4 space-y-3">
                  {message.options.map((option, i) => (
                    <div
                      key={i}
                      className="bg-[#1E2533] rounded-lg p-3 border border-[#34C759]"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold">{option.protocol}</span>
                        <span className="text-[#34C759] text-lg font-bold">
                          {option.apy}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={cn(
                          "text-sm",
                          option.risk === "low" && "text-green-400",
                          option.risk === "medium" && "text-yellow-400",
                          option.risk === "high" && "text-red-400"
                        )}>
                          {option.risk.charAt(0).toUpperCase() + option.risk.slice(1)} Risk
                        </span>
                        <Button className="bg-[#34C759] hover:bg-[#2FB350] text-white text-sm">
                          Stake Now
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-[#252C3B] rounded-lg p-3">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-[#34C759] rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-[#34C759] rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-[#34C759] rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Action Buttons */}
      <div className="p-4 border-t border-[#252C3B]">
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            variant="outline"
            className="bg-[#1E2533] text-white hover:bg-[#252C3B]"
            onClick={() => handleQuickAction("Buy 0.1 SOL")}
          >
            Buy SOL
          </Button>
          <Button
            variant="outline"
            className="bg-[#1E2533] text-white hover:bg-[#252C3B]"
            onClick={() => handleQuickAction("Show me yield options")}
          >
            Explore Yield Options
          </Button>
          <Button
            variant="outline"
            className="bg-[#1E2533] text-white hover:bg-[#252C3B]"
            onClick={() => handleQuickAction("View my portfolio")}
          >
            View Portfolio
          </Button>
        </div>

        {/* Input Area */}
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type your message..."
            className="flex-1 bg-[#1E2533] border-[#252C3B] text-white focus:border-[#34C759]"
          />
          <Button
            onClick={handleSend}
            className="bg-[#34C759] hover:bg-[#2FB350] text-white"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
