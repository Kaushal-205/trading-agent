"use client"

import {
  BaseMessageSignerWalletAdapter,
  WalletReadyState,
  WalletName,
  WalletNotConnectedError,
  SupportedTransactionVersions
} from "@solana/wallet-adapter-base"
import { Connection, PublicKey, Transaction, VersionedTransaction, TransactionVersion } from "@solana/web3.js"
import { usePrivyAuth } from "./privy-auth-provider"
import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createContext, useContext } from "react"

export const PrivyAdapterName = "Privy" as WalletName<"Privy">

export class PrivyWalletAdapter extends BaseMessageSignerWalletAdapter {
  name = PrivyAdapterName
  url = "https://privy.io"
  icon = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDQ4IiBoZWlnaHQ9IjQwMiIgdmlld0JveD0iMCAwIDQ0OCA0MDIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik00NDggMzAxLjVWMTAwLjVDNDQ4IDQ1IDE0MiAwIDE0MiAwQzE0MiAwIDAgNTUgMCAxNTJWMzk5QzAgMzk5IDYwIDM0MiAxNTcgMzQySDMwMEM0MDguNCAzNDIgNDQ4IDMzNy44IDQ0OCAzMDEuNVoiIGZpbGw9IiMwMEFCM0QiLz4KPHBhdGggZD0iTTMxMCAxOTlMMTU2IDEyMlYyNzZMMzEwIDE5OVoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo="
  supportedTransactionVersions: SupportedTransactionVersions = new Set(['legacy', 0] as TransactionVersion[])

  private _connecting: boolean
  private _publicKey: PublicKey | null
  private _readyState: WalletReadyState
  private _signMessage: ((message: Uint8Array) => Promise<Uint8Array>) | null
  private _signTransaction: ((transaction: Transaction | VersionedTransaction, connection: Connection) => Promise<string>) | null
  private _onDisconnect: (() => void) | null
  
  constructor(config: {
    publicKey: PublicKey | null
    signMessage: ((message: Uint8Array) => Promise<Uint8Array>) | null
    signTransaction: ((transaction: Transaction | VersionedTransaction, connection: Connection) => Promise<string>) | null
    disconnect: (() => void) | null
  }) {
    super()
    this._connecting = false
    this._publicKey = config.publicKey
    this._readyState = this._publicKey ? WalletReadyState.Installed : WalletReadyState.NotDetected
    this._signMessage = config.signMessage 
    this._signTransaction = config.signTransaction
    this._onDisconnect = config.disconnect
  }

  get publicKey(): PublicKey | null {
    return this._publicKey
  }

  get connecting(): boolean {
    return this._connecting
  }

  get connected(): boolean {
    return !!this._publicKey
  }

  get readyState(): WalletReadyState {
    return this._readyState
  }

  async connect(): Promise<void> {
    if (this.connected || this.connecting) return
    if (this._readyState !== WalletReadyState.Installed) throw new WalletNotConnectedError()

    this._connecting = true

    try {
      // The connect function would typically be implemented here, but in this adapter,
      // the connection is managed by the PrivyAuthProvider
      this.emit("connect", this._publicKey!)
    } catch (error: any) {
      this.emit("error", error)
      throw error
    } finally {
      this._connecting = false
    }
  }

  async disconnect(): Promise<void> {
    if (this._onDisconnect) {
      this._onDisconnect()
    }
    this.emit("disconnect")
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    if (!this._publicKey) throw new WalletNotConnectedError()
    if (!this._signMessage) throw new Error("Sign message method not provided")
    
    try {
      const signature = await this._signMessage(message)
      return signature
    } catch (error: any) {
      this.emit("error", error)
      throw error
    }
  }
  
  async signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T> {
    if (!this._publicKey) throw new WalletNotConnectedError()
    if (!this._signTransaction) throw new Error("Sign transaction method not provided")
    
    try {
      // Sign the transaction
      await this._signTransaction(transaction, new Connection("https://api.mainnet-beta.solana.com"))
      return transaction
    } catch (error: any) {
      this.emit("error", error)
      throw error
    }
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]> {
    if (!this.connected) throw new WalletNotConnectedError()
    return await Promise.all(transactions.map(transaction => this.signTransaction(transaction)))
  }
}

interface PrivyAdapterContextState {
  adapter: PrivyWalletAdapter | null
}

const PrivyAdapterContext = createContext<PrivyAdapterContextState>({ adapter: null })

export const usePrivyAdapter = () => useContext(PrivyAdapterContext)

export const PrivyAdapterProvider: FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, walletAddress, signMessage, sendTransaction, logout } = usePrivyAuth()
  const [adapter, setAdapter] = useState<PrivyWalletAdapter | null>(null)
  const prevWalletAddressRef = useRef<string | null>(null)

  // Create and update adapter when wallet status changes
  useEffect(() => {
    if (isAuthenticated && walletAddress && walletAddress !== prevWalletAddressRef.current) {
      prevWalletAddressRef.current = walletAddress
      
      // Create a new adapter instance
      const publicKey = new PublicKey(walletAddress)
      const privyAdapter = new PrivyWalletAdapter({
        publicKey,
        signMessage,
        signTransaction: sendTransaction,
        disconnect: logout
      })
      
      setAdapter(privyAdapter)
      
      // Emit connect event
      privyAdapter.emit("connect", publicKey)
    } else if (!isAuthenticated && prevWalletAddressRef.current) {
      // When disconnected
      prevWalletAddressRef.current = null
      
      // Emit disconnect event if adapter exists
      if (adapter) {
        adapter.emit("disconnect")
      }
      
      setAdapter(null)
    }
  }, [isAuthenticated, walletAddress, signMessage, sendTransaction, logout, adapter])

  const contextValue = useMemo(() => ({ adapter }), [adapter])

  return (
    <PrivyAdapterContext.Provider value={contextValue}>
      {children}
    </PrivyAdapterContext.Provider>
  )
} 
