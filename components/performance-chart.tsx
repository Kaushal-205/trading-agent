"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

const data = [
  { date: "May 1", value: 10.2, yield: 0.05 },
  { date: "May 2", value: 10.3, yield: 0.1 },
  { date: "May 3", value: 10.4, yield: 0.15 },
  { date: "May 4", value: 10.5, yield: 0.2 },
  { date: "May 5", value: 10.7, yield: 0.25 },
  { date: "May 6", value: 10.9, yield: 0.3 },
  { date: "May 7", value: 11.1, yield: 0.35 },
  { date: "May 8", value: 11.3, yield: 0.4 },
  { date: "May 9", value: 11.5, yield: 0.45 },
  { date: "May 10", value: 11.7, yield: 0.5 },
  { date: "May 11", value: 11.9, yield: 0.55 },
  { date: "May 12", value: 12.1, yield: 0.6 },
  { date: "May 13", value: 12.3, yield: 0.65 },
  { date: "May 14", value: 12.45, yield: 0.7 },
]

export function PerformanceChart() {
  const [timeframe, setTimeframe] = useState("7d")

  const timeframes = [
    { value: "7d", label: "7D" },
    { value: "30d", label: "30D" },
    { value: "90d", label: "90D" },
    { value: "1y", label: "1Y" },
    { value: "all", label: "All" },
  ]

  // Filter data based on timeframe
  const filteredData = timeframe === "7d" ? data.slice(-7) : data

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {timeframes.map((tf) => (
          <Button
            key={tf.value}
            variant={timeframe === tf.value ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeframe(tf.value)}
          >
            {tf.label}
          </Button>
        ))}
      </div>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filteredData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="date" stroke="#888" />
            <YAxis
              yAxisId="left"
              stroke="#888"
              domain={["dataMin - 0.5", "dataMax + 0.5"]}
              tickFormatter={(value) => `${value} SOL`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#888"
              domain={[0, "dataMax + 0.1"]}
              tickFormatter={(value) => `${value} SOL`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(17, 24, 39, 0.9)",
                border: "1px solid #374151",
                borderRadius: "6px",
              }}
            />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="value"
              name="Portfolio Value"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="yield"
              name="Yield Earned"
              stroke="#06b6d4"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
