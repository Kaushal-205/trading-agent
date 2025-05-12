"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { YieldOptions } from "@/components/yield-options"
import { PortfolioMetrics } from "@/components/portfolio-metrics"
import { PerformanceChart } from "@/components/performance-chart"
import { PositionsTable } from "@/components/positions-table"
import { useWalletAuth } from "@/components/solana/wallet-auth-provider"
import { PageContainer } from "@/components/page-container"

export function Dashboard() {
  const { isAuthenticated } = useWalletAuth()

  return (
    <PageContainer 
      title="Dashboard" 
      subtitle="Monitor your portfolio and explore yield opportunities."
    >
      <div className="p-4">
        {!isAuthenticated && (
          <div className="rounded-lg border border-dashed border-border p-4 bg-secondary/30 text-sm mb-4">
            <p className="text-center sm:text-left">
              <strong>Demo Mode:</strong> Showing simulated data. For a live experience, connect your Privy wallet.
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
    </PageContainer>
  )
}
