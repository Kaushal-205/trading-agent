"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, ShieldAlert, ShieldCheck } from "lucide-react"

const yieldOptions = [
  {
    id: 1,
    protocol: "Raydium",
    apy: 8.5,
    risk: "low",
    description: "Automated market maker (AMM) and yield farming protocol built on Solana.",
    icon: "/placeholder.svg?height=40&width=40",
  },
  {
    id: 2,
    protocol: "Mango Markets",
    apy: 12.3,
    risk: "medium",
    description: "Decentralized, cross-margin trading platform with integrated spot markets.",
    icon: "/placeholder.svg?height=40&width=40",
  },
  {
    id: 3,
    protocol: "Marinade Finance",
    apy: 6.7,
    risk: "low",
    description: "Liquid staking protocol that lets you stake SOL while maintaining liquidity.",
    icon: "/placeholder.svg?height=40&width=40",
  },
  {
    id: 4,
    protocol: "Solend",
    apy: 10.2,
    risk: "medium",
    description: "Algorithmic, decentralized protocol for lending and borrowing on Solana.",
    icon: "/placeholder.svg?height=40&width=40",
  },
  {
    id: 5,
    protocol: "Orca",
    apy: 9.8,
    risk: "medium",
    description: "User-friendly DEX designed for traders of all experience levels.",
    icon: "/placeholder.svg?height=40&width=40",
  },
  {
    id: 6,
    protocol: "Jet Protocol",
    apy: 15.1,
    risk: "high",
    description: "Borrowing and lending protocol built on Solana.",
    icon: "/placeholder.svg?height=40&width=40",
  },
]

export function YieldOptions() {
  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case "low":
        return <ShieldCheck className="h-4 w-4 text-emerald-500" />
      case "medium":
        return <Shield className="h-4 w-4 text-amber-500" />
      case "high":
        return <ShieldAlert className="h-4 w-4 text-rose-500" />
      default:
        return <Shield className="h-4 w-4" />
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low":
        return "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
      case "medium":
        return "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
      case "high":
        return "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20"
      default:
        return ""
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {yieldOptions.map((option) => (
        <Card key={option.id} className="overflow-hidden transition-all hover:shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={option.icon || "/placeholder.svg"} alt={option.protocol} className="h-8 w-8 rounded-full" />
                <CardTitle>{option.protocol}</CardTitle>
              </div>
              <Badge variant="outline" className={getRiskColor(option.risk)}>
                <span className="flex items-center gap-1">
                  {getRiskIcon(option.risk)} {option.risk}
                </span>
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="text-3xl font-bold text-emerald-500">{option.apy}% APY</div>
            </div>
            <p className="text-sm text-muted-foreground">{option.description}</p>
          </CardContent>
          <CardFooter>
            <Button className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600">
              Stake Now
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
