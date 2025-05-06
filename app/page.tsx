import { AppSidebar } from "@/components/app-sidebar"
import { Header } from "@/components/header"
import { Dashboard } from "@/components/dashboard"
import { ChatInterface } from "@/components/chat-interface"

export default function Home({
  searchParams,
}: {
  searchParams: { tab?: string }
}) {
  const showDashboard = searchParams.tab === "dashboard"

  return (
    <div className="flex w-full min-h-screen bg-background">
      <AppSidebar />
      <div className="flex flex-col flex-1 w-full">
        <Header />
        <main className="flex-1 w-full overflow-auto p-4 md:p-6">
          {showDashboard ? (
            <Dashboard />
          ) : (
            <div className="h-[70vh] bg-[#1E2533] rounded-lg shadow-lg flex flex-col">
              <div className="p-4 border-b border-[#252C3B]">
                <h2 className="text-xl font-semibold text-white">Chat with YieldAgent</h2>
              </div>
              <ChatInterface />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}