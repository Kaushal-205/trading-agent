"use client"

import { useEffect } from "react"
import { usePrivy } from "@privy-io/react-auth"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function PrivyLoginModal() {
  const { login, ready, authenticated } = usePrivy()

  // Login modal only shows when user is not authenticated
  const isOpen = ready && !authenticated

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Login to continue</DialogTitle>
          <DialogDescription>
            Please sign in with your preferred method to use the application and access your embedded wallet.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center py-4">
          <button
            onClick={() => login()}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-md hover:from-blue-600 hover:to-indigo-700 transition-colors"
          >
            Sign In with Privy
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 
