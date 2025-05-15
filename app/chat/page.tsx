"use client"

import dynamic from 'next/dynamic'

// Dynamically import ChatInterface with SSR turned off
const ChatInterface = dynamic(() => import('@/components/chat-interface'), {
  ssr: false,
  // Optional: loading component
  loading: () => <p>Loading chat...</p> 
})

export default function ChatPage() {
  return (
    <div className="h-full">
      <ChatInterface />
    </div>
  )
} 
