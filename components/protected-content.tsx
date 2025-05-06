"use client"

import type { ReactNode } from "react"
import { useWalletAuth } from "@/components/solana/wallet-auth-provider"
import { Button } from "@/components/ui/button"
import { LockIcon, Wallet } from "lucide-react"
import { useWallet } from "@solana/wallet-adapter-react"
import { useWalletModal } from "@solana/wallet-adapter-react-ui"

interface ProtectedContentProps {
  children: ReactNode
  fallback?: ReactNode
}

export function ProtectedContent({ children, fallback }: ProtectedContentProps) {
  const { publicKey } = useWallet()
  const { setVisible } = useWalletModal()
  const { isAuthenticated, authenticate, isAuthenticating } = useWalletAuth()

  // Default fallback content if none provided
  const defaultFallback = (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-8 text-center">
      <div className="mb-4 rounded-full bg-muted p-3">
        <LockIcon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="mb-2 text-lg font-medium">Authentication Required</h3>
      <p className="mb-4 max-w-md text-sm text-muted-foreground">
        {!publicKey
          ? "Connect your Solana wallet to access this content."
          : "Please authenticate with your wallet to view this content."}
      </p>
      {!publicKey ? (
        <Button
          onClick={() => setVisible(true)}
          className="gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
        >
          <Wallet className="h-4 w-4" />
          Connect Wallet
        </Button>
      ) : (
        <Button
          onClick={() => authenticate()}
          disabled={isAuthenticating}
          className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
        >
          Authenticate
        </Button>
      )}
    </div>
  )

  if (!isAuthenticated) {
    return fallback || defaultFallback
  }

  return <>{children}</>
}
