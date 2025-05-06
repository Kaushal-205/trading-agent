import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { message } = await req.json()

    // TODO: Replace with actual LLM integration
    // This is a mock response for demonstration
    const response = {
      intent: "explore_yield",
      message: "Here are some optimized yield options for your SOL.",
      options: [
        { protocol: "Raydium", apy: 8.5, risk: "medium" },
        { protocol: "Mango Markets", apy: 5.2, risk: "low" },
        { protocol: "Tulip Protocol", apy: 7.8, risk: "medium" }
      ]
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Chat API Error:", error)
    return NextResponse.json(
      { error: "Failed to process chat request" },
      { status: 500 }
    )
  }
} 