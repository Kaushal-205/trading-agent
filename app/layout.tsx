import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { SidebarProvider } from "@/components/ui/sidebar"
import { SolanaWalletProvider } from "@/components/solana/wallet-provider"
import { WalletAuthProvider } from "@/components/solana/wallet-auth-provider"
import { Toaster } from "@/components/toaster"
import { Suspense } from "react"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Trading/Yield Agent",
  description: "Modern Trading and Yield Agent Platform",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <body className={`${inter.className} min-h-full w-full antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <div className="flex min-h-screen w-full">
            <SolanaWalletProvider>
              <WalletAuthProvider>
                <SidebarProvider>
                  <div className="flex min-h-screen w-full">
                    <Suspense fallback={<div>Loading...</div>}>
                      {children}
                    </Suspense>
                  </div>
                </SidebarProvider>
                <Toaster />
              </WalletAuthProvider>
            </SolanaWalletProvider>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
