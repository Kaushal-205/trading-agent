"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowUpDown, MoreHorizontal, Loader2 } from "lucide-react"
import { useWallet } from "@solana/wallet-adapter-react"
import { useWalletAuth } from "./solana/wallet-auth-provider"

// Define the position data type
interface Position {
  id: number
  protocol: string
  amount: number
  apy: number
  rewards: number
  startDate: string
}

export function PositionsTable() {
  const { publicKey } = useWallet()
  const { isAuthenticated } = useWalletAuth()
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState("protocol")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [error, setError] = useState<string | null>(null)

  // Fetch positions data
  useEffect(() => {
    const fetchPositions = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Demo positions data - in a real app this would come from backend APIs
        const demoPositions: Position[] = [
          {
            id: 1,
            protocol: "Raydium",
            amount: 3.5,
            apy: 8.5,
            rewards: 0.12,
            startDate: "2023-04-15",
          },
          {
            id: 2,
            protocol: "Marinade Finance",
            amount: 2.75,
            apy: 6.7,
            rewards: 0.08,
            startDate: "2023-04-02",
          },
          {
            id: 3,
            protocol: "Solend",
            amount: 1.5,
            apy: 10.2,
            rewards: 0.07,
            startDate: "2023-04-20",
          },
          {
            id: 4,
            protocol: "Orca",
            amount: 1.0,
            apy: 9.8,
            rewards: 0.05,
            startDate: "2023-04-25",
          },
        ]
        
        // If we're not authenticated, show demo data
        // In a production app, you'd only show real data when authenticated
        if (!publicKey || !isAuthenticated) {
          // For demo purposes - in production you might show a message instead
          setPositions(demoPositions)
        } else {
          // In a real app, this would be fetched from Solana programs based on the wallet
          setPositions(demoPositions)
        }
        
        setLoading(false)
      } catch (error) {
        console.error("Error fetching positions:", error)
        setError("Failed to load positions. Using demo data.")
        
        // Provide fallback data for the demo
        setPositions([
          {
            id: 1,
            protocol: "Raydium",
            amount: 3.5,
            apy: 8.5,
            rewards: 0.12,
            startDate: "2023-04-15",
          },
          {
            id: 2,
            protocol: "Marinade Finance",
            amount: 2.75,
            apy: 6.7,
            rewards: 0.08,
            startDate: "2023-04-02",
          }
        ])
        
        setLoading(false)
      }
    }

    fetchPositions()
  }, [publicKey, isAuthenticated])

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(column)
      setSortOrder("asc")
    }
  }

  const sortedPositions = [...positions].sort((a, b) => {
    const aValue = a[sortBy as keyof typeof a]
    const bValue = b[sortBy as keyof typeof b]

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortOrder === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
    }

    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortOrder === "asc" ? aValue - bValue : bValue - aValue
    }

    return 0
  })

  if (loading) {
    return (
      <div className="rounded-md border p-8 flex items-center justify-center min-h-[200px] bg-card">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mr-2" />
        <span>Loading positions...</span>
      </div>
    )
  }

  if (positions.length === 0 && !loading) {
    return (
      <div className="rounded-md border p-8 text-center min-h-[200px] flex flex-col items-center justify-center bg-card">
        <p className="text-muted-foreground mb-4">No positions found.</p>
        <Button className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600">
          Stake SOL to get started
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-md border overflow-hidden">
      {error && (
        <div className="p-2 bg-amber-500/20 text-amber-800 text-sm">
          {error}
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead onClick={() => handleSort("protocol")} className="cursor-pointer">
              <div className="flex items-center">
                Protocol
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </div>
            </TableHead>
            <TableHead onClick={() => handleSort("amount")} className="cursor-pointer">
              <div className="flex items-center">
                Amount (SOL)
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </div>
            </TableHead>
            <TableHead onClick={() => handleSort("apy")} className="cursor-pointer">
              <div className="flex items-center">
                APY (%)
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </div>
            </TableHead>
            <TableHead onClick={() => handleSort("rewards")} className="cursor-pointer">
              <div className="flex items-center">
                Rewards (SOL)
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </div>
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedPositions.map((position) => (
            <TableRow key={position.id}>
              <TableCell className="font-medium">{position.protocol}</TableCell>
              <TableCell>{position.amount.toFixed(2)}</TableCell>
              <TableCell>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500">
                  {position.apy.toFixed(1)}%
                </Badge>
              </TableCell>
              <TableCell>{position.rewards.toFixed(4)}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Add More</DropdownMenuItem>
                    <DropdownMenuItem>Claim Rewards</DropdownMenuItem>
                    <DropdownMenuItem>Unstake</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
