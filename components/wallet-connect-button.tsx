"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Wallet, LogOut, CheckCircle, Copy, ExternalLink } from "lucide-react"
import { usePrivyAuth } from "@/components/privy/privy-auth-provider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "@/components/ui/use-toast"
import { ToastAction } from "@/components/ui/toast"

export function WalletConnectButton() {
  const { isAuthenticated, isAuthenticating, authenticate, logout, authError, walletAddress } = usePrivyAuth()
  const [isAuthenticatingLocal, setIsAuthenticatingLocal] = useState(false)

  const handleAuthenticate = async () => {
    setIsAuthenticatingLocal(true)
    try {
      const success = await authenticate()
      if (success) {
        toast({
          title: "Authentication successful",
          description: "You are now connected with your Privy wallet.",
          variant: "default",
        })
      } else if (authError) {
        toast({
          title: "Authentication failed",
          description: authError,
          variant: "destructive",
          action: (
            <ToastAction altText="Try again" onClick={handleAuthenticate}>
              Try again
            </ToastAction>
          ),
        })
      }
    } finally {
      setIsAuthenticatingLocal(false)
    }
  }

  const handleLogout = () => {
    logout()
    toast({
      title: "Logged out",
      description: "You have been logged out successfully.",
    })
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <Button
        onClick={handleAuthenticate}
        disabled={isAuthenticating || isAuthenticatingLocal}
        variant="purple"
      >
        {isAuthenticating || isAuthenticatingLocal ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Wallet className="h-4 w-4" />
        )}
        {isAuthenticating || isAuthenticatingLocal ? "Connecting..." : "Connect Wallet"}
      </Button>
    )
  }

  // Connected and authenticated
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 border-brand-purple/30 bg-brand-purple/10 text-black">
          <CheckCircle className="h-4 w-4 text-brand-purple" />
          <span>Connected</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(walletAddress || "")}>
          <Copy className="mr-2 h-4 w-4" />
          Copy Address
        </DropdownMenuItem>
        {walletAddress && (
          <DropdownMenuItem
            onClick={() =>
              window.open(`https://solscan.io/address/${walletAddress}?cluster=devnet`, "_blank")
            }
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            View on Explorer
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="gap-2 text-red-500">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
