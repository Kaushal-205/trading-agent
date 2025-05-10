"use client"

import { useWalletAuth } from "@/components/solana/wallet-auth-provider"
import { useWallet } from "@solana/wallet-adapter-react"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertCircle } from "lucide-react"

export function AuthStatus() {
  const { connected } = useWallet()
  const { isAuthenticated } = useWalletAuth()

  if (!connected) {
    return (
      <Badge variant="outline" className="gap-1 border-red-500/30 bg-red-500/10 text-red-500">
        <XCircle className="h-3 w-3" />
        <span>Wallet Disconnected</span>
      </Badge>
    )
  }

  if (!isAuthenticated) {
    return (
      <Badge variant="outline" className="gap-1 border-amber-500/30 bg-amber-500/10 text-amber-500">
        <AlertCircle className="h-3 w-3" />
        <span>Not Authenticated</span>
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-500">
      <CheckCircle className="h-3 w-3" />
      <span>Authenticated</span>
    </Badge>
  )
}
