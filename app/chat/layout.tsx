"use client"
import { Header } from "@/components"
import { AppSidebar } from "@/components/app-sidebar"
// Removed the import for Header due to the error

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex w-full min-h-screen bg-background">
      <AppSidebar />
      <div className="flex flex-col flex-1 w-full">
        <Header title={"Chat with YieldAgent"} />
        <main className="flex-1 w-full overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
} 
