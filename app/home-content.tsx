"use client"

import dynamic from "next/dynamic"
import { PageContainer } from "@/components/page-container"

const DynamicChatInterface = dynamic(
  () => import('../components/chat-interface'),
  { 
    loading: () => <p>Loading...</p>,
    ssr: false
  }
)

export function HomeContent() {
  return (
    <PageContainer title="Chat with YieldAgent">
      <div className="flex-1 overflow-hidden">
        <DynamicChatInterface />
      </div>
    </PageContainer>
  )
} 
