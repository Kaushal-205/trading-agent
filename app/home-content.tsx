"use client"

import dynamic from "next/dynamic"
import { PageContainer } from "@/components/page-container"

const ChatInterface = dynamic(
  () => import("@/components/chat-interface-refactored").then(mod => mod.ChatInterface),
  { ssr: false }
)

export function HomeContent() {
  return (
    <PageContainer title="Chat with YieldAgent">
      <div className="flex-1 overflow-hidden">
        <ChatInterface />
      </div>
    </PageContainer>
  )
} 
