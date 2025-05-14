import React from "react"
import { Skeleton } from "@/components/ui/skeleton"

interface LoaderProps {
  className?: string
}

export function Loader({ className }: LoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-4 space-y-4">
      <div className="text-xl font-medium text-brand-purple mb-4">Loading How3 Agent</div>
      <Skeleton className={`h-6 w-32 ${className}`} />
      <Skeleton className={`h-6 w-48 ${className}`} />
      <Skeleton className={`h-6 w-40 ${className}`} />
    </div>
  )
} 