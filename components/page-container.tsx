"use client"

import { ReactNode } from "react"
import { Header } from "@/components/header"

interface PageContainerProps {
  title: string
  subtitle?: string
  rightHeaderContent?: ReactNode
  children: ReactNode
}

export function PageContainer({ 
  title, 
  subtitle, 
  rightHeaderContent, 
  children 
}: PageContainerProps) {
  return (
    <div className="flex flex-1 flex-col h-full overflow-auto">
      <Header 
        title={title} 
        subtitle={subtitle} 
        rightContent={rightHeaderContent} 
      />
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
} 
