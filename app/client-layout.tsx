"use client"

import React, { Suspense } from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { PrivyWalletProvider } from "@/components/privy/privy-provider"
import { PrivyAuthProvider } from "@/components/privy/privy-auth-provider"
import { PrivyAdapterProvider } from "@/components/privy/privy-adapter"
import { SolanaWalletProvider } from "@/components/solana/wallet-provider"
import { Toaster } from "@/components/toaster"
import { AppSidebar } from "@/components/app-sidebar"
import { Loader } from "@/components/ui/loader"

interface ClientLayoutProps {
  children: React.ReactNode
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <PrivyWalletProvider>
      <PrivyAuthProvider>
        <PrivyAdapterProvider>
          <SolanaWalletProvider>
            <SidebarProvider>
              <div className="app-layout">
                <AppSidebar />
                <div className="main-content">
                  <Suspense fallback={<Loader />}>
                    {children}
                  </Suspense>
                </div>
              </div>
            </SidebarProvider>
            <Toaster />
          </SolanaWalletProvider>
        </PrivyAdapterProvider>
      </PrivyAuthProvider>
    </PrivyWalletProvider>
  )
} 
