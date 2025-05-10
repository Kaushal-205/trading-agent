"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowUpDown, MoreHorizontal } from "lucide-react"

const positions = [
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

export function PositionsTable() {
  const [sortBy, setSortBy] = useState("protocol")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

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

  return (
    <div className="rounded-md border">
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
