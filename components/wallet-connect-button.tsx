"use client"

import { useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { useWalletModal } from "@solana/wallet-adapter-react-ui"
import { Button } from "@/components/ui/button"
import { Loader2, Wallet, LogOut, CheckCircle } from "lucide-react"
import { useWalletAuth } from "@/components/solana/wallet-auth-provider"
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
  const { publicKey, disconnect } = useWallet()
  const { setVisible } = useWalletModal()
  const { isAuthenticated, isAuthenticating, authenticate, logout, authError, shortAddress } = useWalletAuth()
  const [isAuthenticatingLocal, setIsAuthenticatingLocal] = useState(false)

  const handleConnect = () => {
    setVisible(true)
  }

  const handleDisconnect = () => {
    disconnect()
  }

  const handleAuthenticate = async () => {
    setIsAuthenticatingLocal(true)
    try {
      const success = await authenticate()
      if (success) {
        toast({
          title: "Authentication successful",
          description: "You are now authenticated with your Solana wallet.",
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

  // Not connected
  if (!publicKey) {
    return (
      <Button
        onClick={handleConnect}
        className="gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
      >
        <Wallet className="h-4 w-4" />
        Connect Wallet
      </Button>
    )
  }

  // Connected but not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex gap-2">
        <Button
          onClick={handleAuthenticate}
          disabled={isAuthenticating || isAuthenticatingLocal}
          className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
        >
          {isAuthenticating || isAuthenticatingLocal ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          Authenticate
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Wallet className="h-4 w-4" />
              <span>{shortAddress}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(publicKey.toString())}>
              Copy Address
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                window.open(`https://explorer.solana.com/address/${publicKey.toString()}?cluster=devnet`, "_blank")
              }
            >
              View on Explorer
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDisconnect} className="text-destructive focus:text-destructive">
              Disconnect
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  // Connected and authenticated
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 border-emerald-500/30 bg-emerald-500/10">
          <CheckCircle className="h-4 w-4 text-emerald-500" />
          <span>{shortAddress}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(publicKey.toString())}>
          Copy Address
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            window.open(`https://explorer.solana.com/address/${publicKey.toString()}?cluster=devnet`, "_blank")
          }
        >
          View on Explorer
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="gap-2">
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDisconnect} className="text-destructive focus:text-destructive">
          Disconnect Wallet
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
