"use client"

import { FC } from "react"
import { Button } from "@/components/ui/button"
import { usePrivyAuth } from "./privy-auth-provider"
import { usePrivyAdapter } from "./privy-adapter"
import { useWallet } from "@solana/wallet-adapter-react"

export const PrivyWalletButton: FC = () => {
  const { isAuthenticated, walletAddress, authenticate, logout } = usePrivyAuth()
  const { connected, publicKey } = useWallet()

  // Handle button click based on authentication status
  const handleClick = () => {
    if (isAuthenticated) {
      logout()
    } else {
      authenticate()
    }
  }

  // Format the wallet address for display
  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  return (
    <Button
      variant={isAuthenticated ? "outline" : "default"}
      onClick={handleClick}
      className="min-w-[130px]"
    >
      {isAuthenticated && walletAddress
        ? formatAddress(walletAddress)
        : "Connect Wallet"}
    </Button>
  )
} 
