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
import { ThemeToggle } from "@/components/theme-toggle"
import { AuthStatus } from "@/components/auth-status"
import { useRouter, usePathname, useSearchParams } from "next/navigation"

export function AppSidebar() {
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
    <Sidebar>
      <SidebarHeader className="flex items-center justify-center py-6">
        <div 
          className="flex items-center space-x-2 cursor-pointer"
          onClick={handleLogoClick}
        >
          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 flex items-center justify-center">
            <span className="font-bold text-black">YA</span>
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            YieldAgent
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <div className="px-3 py-2">
          <AuthStatus />
        </div>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton 
                asChild 
                isActive={isActive(item.label)}
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
      <SidebarFooter className="p-4">
        <div className="space-y-4">
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
