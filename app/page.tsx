"use client"

import { useSearchParams } from "next/navigation"
import { HomeContent } from "./home-content"
import { Dashboard } from "@/components/dashboard"

export default function Home() {
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab')

  return (
    <main className="flex flex-1 flex-col h-screen overflow-auto">
      {tab === "dashboard" ? <Dashboard /> : <HomeContent />}
    </main>
  )
}
