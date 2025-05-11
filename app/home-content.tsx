"use client"

import { Dashboard } from "@/components/dashboard"
import dynamic from "next/dynamic"
import { useSearchParams } from "next/navigation"

const ChatInterface = dynamic(
  () => import("@/components/chat-interface").then(mod => mod.ChatInterface),
  { ssr: false }
)

export function HomeContent() {
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab')

  return (
    <div className="h-[70vh] bg-[#1E2533] rounded-lg shadow-lg flex flex-col">
      <div className="p-4 border-b border-[#252C3B]">
        <h2 className="text-xl font-semibold text-white">Chat with YieldAgent</h2>
      </div>
      {tab === "dashboard" ? <Dashboard /> : <ChatInterface />}
    </div>
  )
} 