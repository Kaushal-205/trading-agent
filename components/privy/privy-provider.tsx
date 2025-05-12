"use client"

import { type FC, type ReactNode } from "react"
import { PrivyProvider } from "@privy-io/react-auth"
import { useRouter } from "next/navigation"

// Define the props for the PrivyWalletProvider component
interface PrivyWalletProviderProps {
  children: ReactNode
}

export const PrivyWalletProvider: FC<PrivyWalletProviderProps> = ({ children }) => {
  const router = useRouter()

  // Replace this with your actual Privy App ID from the Privy dashboard
  const PRIVY_APP_ID = "cmal2yx6701cil70l1o884t55"

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ["email", "google", "apple", "discord", "github"],
        appearance: {
          theme: "dark",
          accentColor: "#4F46E5", // Indigo color that matches Solana's branding
          logo: "https://your-logo-url.com/logo.png" // Replace with your actual logo URL
        },
        embeddedWallets: {
          createOnLogin: "users-without-wallets"
        }
      }}
    >
      {children}
    </PrivyProvider>
  )
} 
