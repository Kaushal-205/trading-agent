"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { YieldOptions } from "@/components/yield-options"
import { PortfolioMetrics } from "@/components/portfolio-metrics"
import { PerformanceChart } from "@/components/performance-chart"
import { PositionsTable } from "@/components/positions-table"
import { ProtectedContent } from "@/components/protected-content"

export function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Monitor your portfolio and explore yield opportunities.</p>
      </div>

      <ProtectedContent>
        <PortfolioMetrics />

        <Tabs defaultValue="performance" className="space-y-4">
          <TabsList>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="yield-options">Yield Options</TabsTrigger>
            <TabsTrigger value="positions">Positions</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Portfolio Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <PerformanceChart />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="yield-options" className="space-y-4">
            <YieldOptions />
          </TabsContent>

          <TabsContent value="positions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Your Positions</CardTitle>
              </CardHeader>
              <CardContent>
                <PositionsTable />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </ProtectedContent>
    </div>
  )
}
