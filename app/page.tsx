import { AppSidebar } from "@/components/app-sidebar"
import { Header } from "@/components/header"
import { HomeContent } from "./home-content"

export default function Home() {
  return (
    <div className="flex w-full min-h-screen bg-background">
      <AppSidebar />
      <div className="flex flex-col flex-1 w-full">
        <Header />
        <main className="flex-1 w-full overflow-auto p-4 md:p-6">
          <HomeContent />
        </main>
      </div>
    </div>
  )
}
