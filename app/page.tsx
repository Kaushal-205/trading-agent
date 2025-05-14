"use client"

import { Suspense } from "react"
import { HomeContent } from "./home-content"
import { Dashboard } from "@/components/dashboard"

// Create a client component that uses useSearchParams
function HomeWithParams() {
  // Import useSearchParams dynamically to avoid the build error
  const { useSearchParams } = require("next/navigation")
  const searchParams = useSearchParams()
  const tab = searchParams?.get?.('tab')

  return (
    <main className="flex flex-1 flex-col h-screen overflow-auto">
      {tab === "dashboard" ? <Dashboard /> : <HomeContent />}
    </main>
  )
}

// Create a fallback component that doesn't use client hooks
function HomeFallback() {
  return (
    <main className="flex flex-1 flex-col h-screen overflow-auto">
      <HomeContent />
    </main>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<HomeFallback />}>
      <HomeWithParams />
    </Suspense>
  )
}
