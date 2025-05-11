"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { YieldOptions } from "@/components/yield-options"
import { PortfolioMetrics } from "@/components/portfolio-metrics"
import { PerformanceChart } from "@/components/performance-chart"
import { PositionsTable } from "@/components/positions-table"
import { useWalletAuth } from "@/components/solana/wallet-auth-provider"
import { useWallet } from "@solana/wallet-adapter-react"
import { Button } from "@/components/ui/button"
import { Wallet } from "lucide-react"
import { useWalletModal } from "@solana/wallet-adapter-react-ui"

export function Dashboard() {
  const { publicKey } = useWallet()
  const { setVisible } = useWalletModal()
  const { isAuthenticated, authenticate } = useWalletAuth()

  return (
    <div className="space-y-6 px-0 md:px-1">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight ml-3">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1 ml-3">Monitor your portfolio and explore yield opportunities.</p>
        </div>
        
        {!isAuthenticated && (
          <div className="flex-shrink-0">
            {!publicKey ? (
              <Button
                onClick={() => setVisible(true)}
                className="gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
              >
                <Wallet className="h-4 w-4" />
                Connect Wallet
              </Button>
            ) : (
              <Button
                onClick={() => authenticate()}
                className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                Authenticate
              </Button>
            )}
          </div>
        )}
      </div>

      {!isAuthenticated && (
        <div className="rounded-lg border border-dashed border-border p-4 bg-gray-900/30 text-sm">
          <p className="text-center sm:text-left">
            <strong>Demo Mode:</strong> Showing simulated data. For a live experience, connect your Solana wallet.
          </p>
        </div>
      )}

      <div>
        <PortfolioMetrics />
      </div>

      <Tabs defaultValue="performance" className="space-y-4 mt-6">
        <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex mb-2">
          <TabsTrigger value="performance" className="text-sm px-3 py-1.5">Performance</TabsTrigger>
          <TabsTrigger value="yield-options" className="text-sm px-3 py-1.5">Yield Options</TabsTrigger>
          <TabsTrigger value="positions" className="text-sm px-3 py-1.5">Positions</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="pt-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold">Portfolio Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <PerformanceChart />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="yield-options" className="pt-2">
          <YieldOptions />
        </TabsContent>

        <TabsContent value="positions" className="pt-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold">Your Positions</CardTitle>
            </CardHeader>
            <CardContent>
              <PositionsTable />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
