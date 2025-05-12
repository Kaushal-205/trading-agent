"use client"

import React, { Suspense } from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { PrivyWalletProvider } from "@/components/privy/privy-provider"
import { PrivyAuthProvider } from "@/components/privy/privy-auth-provider"
import { PrivyAdapterProvider } from "@/components/privy/privy-adapter"
import { SolanaWalletProvider } from "@/components/solana/wallet-provider"
import { Toaster } from "@/components/toaster"

interface ClientLayoutProps {
  children: React.ReactNode
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <div className="flex min-h-screen w-full">
      <PrivyWalletProvider>
        <PrivyAuthProvider>
          <PrivyAdapterProvider>
            <SolanaWalletProvider>
              <SidebarProvider>
                <div className="flex min-h-screen w-full">
                  <Suspense fallback={<div>Loading...</div>}>
                    {children}
                  </Suspense>
                </div>
              </SidebarProvider>
              <Toaster />
            </SolanaWalletProvider>
          </PrivyAdapterProvider>
        </PrivyAuthProvider>
      </PrivyWalletProvider>
    </div>
  )
} 
