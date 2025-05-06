"use client"

import { ThemeToggle } from "@/components/theme-toggle"
import { WalletConnectButton } from "@/components/wallet-connect-button"

export function Header() {
  return (
    <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2 md:hidden">
          {/* Mobile logo */}
          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 flex items-center justify-center">
            <span className="font-bold text-black">YA</span>
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-4">
          <div className="hidden md:flex">
            <ThemeToggle />
          </div>
          <WalletConnectButton />
        </div>
      </div>
    </header>
  )
}
