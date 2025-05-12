"use client"

import { type FC, type ReactNode, useMemo, useState, useCallback, useEffect } from "react"
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base"
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react"
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui"
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom"
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare"
import { clusterApiUrl } from "@solana/web3.js"
import { usePrivyAdapter } from "@/components/privy/privy-adapter"

// Import the wallet adapter styles
import "@solana/wallet-adapter-react-ui/styles.css"

interface SolanaWalletProviderProps {
  children: ReactNode
}

export const SolanaWalletProvider: FC<SolanaWalletProviderProps> = ({ children }) => {
  // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'
  const network = WalletAdapterNetwork.Mainnet

  // You can also provide a custom RPC endpoint
  const endpoint = useMemo(() => clusterApiUrl(network), [network])

  // Get the Privy wallet adapter
  const { adapter: privyAdapter } = usePrivyAdapter()

  // @solana/wallet-adapter-wallets includes all the adapters but supports tree shaking
  // so only the wallets you configure here will be compiled into your application
  const wallets = useMemo(() => {
    const baseWallets = [new PhantomWalletAdapter(), new SolflareWalletAdapter()]
    // Add the Privy adapter if it exists
    return privyAdapter ? [...baseWallets, privyAdapter] : baseWallets
  }, [network, privyAdapter])

  // Add persistent connection state
  const [isConnecting, setIsConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)

  // Handle connection state changes
  const handleConnectionChange = useCallback((connected: boolean) => {
    setIsConnected(connected)
    setIsConnecting(false)
  }, [])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider 
        wallets={wallets} 
        autoConnect
      >
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
