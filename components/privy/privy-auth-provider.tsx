"use client"

import { createContext, useContext, useEffect, useState, type ReactNode, type FC } from "react"
import { usePrivy } from "@privy-io/react-auth"
import { useSolanaWallets, useSendTransaction } from "@privy-io/react-auth/solana"
import { Connection } from "@solana/web3.js"
import bs58 from "bs58"

// Define the auth context type
interface PrivyAuthContextType {
  isAuthenticated: boolean
  isAuthenticating: boolean
  authError: string | null
  authenticate: () => Promise<boolean>
  logout: () => void
  walletAddress: string | null
  shortAddress: string | null
  signMessage: (message: Uint8Array) => Promise<Uint8Array>
  sendTransaction: (transaction: any, connection: Connection) => Promise<string>
}

// Create the context with default values
const PrivyAuthContext = createContext<PrivyAuthContextType>({
  isAuthenticated: false,
  isAuthenticating: false,
  authError: null,
  authenticate: async () => false,
  logout: () => {},
  walletAddress: null,
  shortAddress: null,
  signMessage: async () => new Uint8Array(),
  sendTransaction: async () => "",
})

// Hook to use the Privy auth context
export const usePrivyAuth = () => useContext(PrivyAuthContext)

interface PrivyAuthProviderProps {
  children: ReactNode
}

export const PrivyAuthProvider: FC<PrivyAuthProviderProps> = ({ children }) => {
  const { ready, authenticated, login, logout, user } = usePrivy()
  const { wallets, createWallet } = useSolanaWallets()
  const { sendTransaction: privySendTransaction } = useSendTransaction()
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [shortAddress, setShortAddress] = useState<string | null>(null)

  // Update wallet address when user or wallets change
  useEffect(() => {
    if (!ready) return

    const updateWalletInfo = async () => {
      if (authenticated && user) {
        // Create a wallet if the user doesn't have one yet
        if (wallets.length === 0) {
          try {
            await createWallet()
          } catch (error) {
            // If the error is about the user already having a wallet, we can ignore it
            if (error instanceof Error && error.message.includes("User already has an embedded wallet")) {
              console.log("User already has an embedded wallet, continuing...")
            } else {
              console.error("Error creating wallet:", error)
              setAuthError("Failed to create wallet")
              return
            }
          }
        }

        if (wallets.length > 0) {
          const primaryWallet = wallets[0]
          const address = primaryWallet.address
          setWalletAddress(address)
          setShortAddress(`${address.slice(0, 4)}...${address.slice(-4)}`)
        }
      } else {
        setWalletAddress(null)
        setShortAddress(null)
      }
    }

    updateWalletInfo()
  }, [ready, authenticated, user, wallets, createWallet])

  // Authenticate user
  const authenticate = async (): Promise<boolean> => {
    if (authenticated) return true

    try {
      setIsAuthenticating(true)
      setAuthError(null)

      await login()
      return true
    } catch (error) {
      console.error("Authentication error:", error)
      setAuthError(error instanceof Error ? error.message : "Unknown authentication error")
      return false
    } finally {
      setIsAuthenticating(false)
    }
  }

  // Function to sign a message with the embedded wallet
  const signMessage = async (message: Uint8Array): Promise<Uint8Array> => {
    if (!authenticated || !wallets || wallets.length === 0) {
      throw new Error("Not authenticated or no wallet available")
    }

    try {
      const wallet = wallets[0]
      const signature = await wallet.signMessage(message)
      
      // Return the signature as a Uint8Array
      return new Uint8Array(signature)
    } catch (error) {
      console.error("Error signing message:", error)
      throw new Error("Failed to sign message with Privy wallet")
    }
  }

  // Function to send a transaction
  const sendTransaction = async (transaction: any, connection: Connection): Promise<string> => {
    if (!authenticated || !wallets || wallets.length === 0) {
      throw new Error("Not authenticated or no wallet available")
    }

    try {
      console.log("PrivyAuthProvider: Preparing to send transaction");
      console.log("PrivyAuthProvider: Wallet address:", wallets[0].address);
      
      // Check if the transaction has a blockhash
      if ('recentBlockhash' in transaction && !transaction.recentBlockhash) {
        console.log("PrivyAuthProvider: Adding missing recentBlockhash to transaction");
        const { blockhash } = await connection.getLatestBlockhash('finalized');
        transaction.recentBlockhash = blockhash;
      } else if ('version' in transaction && transaction.message && !transaction.message.recentBlockhash) {
        console.log("PrivyAuthProvider: Adding missing recentBlockhash to versioned transaction");
        const { blockhash } = await connection.getLatestBlockhash('finalized');
        transaction.message.recentBlockhash = blockhash;
      }
      
      console.log("PrivyAuthProvider: Sending transaction with Privy");
      const receipt = await privySendTransaction({
        transaction,
        connection
      });
      
      console.log("PrivyAuthProvider: Transaction sent successfully with signature:", receipt.signature);
      return receipt.signature;
    } catch (error) {
      console.error("PrivyAuthProvider: Error sending transaction:", error);
      
      // Try to extract a more meaningful error message
      let errorMessage = "Failed to send transaction with Privy wallet";
      if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
        
        // Log the full error object for debugging
        console.error("PrivyAuthProvider: Full error:", error);
        
        // Check for specific error types
        if (error.message.includes("blockhash")) {
          errorMessage = "Transaction blockhash error: The transaction blockhash is invalid or expired";
        } else if (error.message.includes("signature")) {
          errorMessage = "Transaction signature error: Failed to sign the transaction";
        }
      }
      
      throw new Error(errorMessage);
    }
  }

  return (
    <PrivyAuthContext.Provider
      value={{
        isAuthenticated: authenticated,
        isAuthenticating,
        authError,
        authenticate,
        logout,
        walletAddress,
        shortAddress,
        signMessage,
        sendTransaction,
      }}
    >
      {children}
    </PrivyAuthContext.Provider>
  )
} 
