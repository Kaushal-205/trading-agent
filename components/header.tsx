"use client"

import { ReactNode } from "react"
import { WalletConnectButton } from "@/components/wallet-connect-button"

interface HeaderProps {
  title: string
  subtitle?: string
  rightContent?: ReactNode
}

export function Header({ title, subtitle, rightContent }: HeaderProps) {
  return (
    <div className="p-4 border-b border-border">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-semibold text-brand-black">{title}</h1>
          {subtitle && <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>}
        </div>
        
        <div className="flex-shrink-0 flex items-center gap-3">
          {rightContent}
          <WalletConnectButton />
        </div>
      </div>
    </div>
  )
}

