"use client"

import { Home, BarChart3, Wallet, Settings, HelpCircle, History, Layers } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Suspense } from "react"

// Create a client component that uses useSearchParams
function AppSidebarContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentTab = searchParams.get('tab')

  const menuItems = [
    { icon: Home, label: "Home", href: "/" },
    { icon: BarChart3, label: "Dashboard", href: "/?tab=dashboard" },
    { icon: Wallet, label: "Portfolio", href: "/?tab=portfolio" },
    { icon: Layers, label: "Yield Options", href: "/?tab=yield-options" },
    { icon: History, label: "Transaction History", href: "/?tab=history" },
    { icon: Settings, label: "Settings", href: "/?tab=settings" },
    { icon: HelpCircle, label: "Help", href: "/?tab=help" },
  ]

  const handleLogoClick = () => {
    router.push("/")
  }

  const handleNavigation = (href: string) => {
    router.push(href)
  }

  const isActive = (label: string): boolean => {
    if (label === "Home" && !currentTab && pathname === "/") {
      return true
    }
    if (label === "Dashboard" && currentTab === "dashboard") {
      return true
    }
    if (label === "Portfolio" && currentTab === "portfolio") {
      return true
    }
    if (label === "Yield Options" && currentTab === "yield-options") {
      return true
    }
    if (label === "Transaction History" && currentTab === "history") {
      return true
    }
    if (label === "Settings" && currentTab === "settings") {
      return true
    }
    if (label === "Help" && currentTab === "help") {
      return true
    }
    return false
  }

  return (
    <>
      <SidebarHeader className="sidebar-header">
        <div 
          className="flex items-center justify-center cursor-pointer"
          onClick={handleLogoClick}
        >
          <Image
            src="/How3logo.svg"
            alt="How3 Logo"
            width={120}
            height={36}
            priority
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton 
                asChild 
                isActive={isActive(item.label)}
                className={isActive(item.label) ? "bg-brand-purple/10 text-brand-purple" : "text-black hover:bg-brand-purple/5 hover:text-brand-purple"}
              >
                <button 
                  onClick={() => handleNavigation(item.href)}
                  className="flex items-center w-full"
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  <span>{item.label}</span>
                  
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </>
  )
}

// Create a fallback component for the sidebar
function SidebarFallback() {
  return (
    <>
      <SidebarHeader className="sidebar-header">
        <div className="flex items-center justify-center">
          <Image
            src="/How3logo.svg"
            alt="How3 Logo"
            width={120}
            height={36}
            priority
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {/* Placeholder menu items */}
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="text-black">
              <button className="flex items-center w-full">
                <Home className="mr-2 h-4 w-4" />
                <span>Loading...</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
    </>
  )
}

export function AppSidebar() {
  return (
    <Sidebar className="app-sidebar bg-gradient-main border-r border-brand-purple/20">
      <Suspense fallback={<SidebarFallback />}>
        <AppSidebarContent />
      </Suspense>
    </Sidebar>
  )
}
