"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { BarChart3, Settings, CreditCard, Home, Zap } from "lucide-react"

const navItems = [
  {
    title: "Overview",
    href: "/dashboard",
    icon: Home,
  },
  {
    title: "Compare Models",
    href: "/compare",
    icon: Zap,
  },
  {
    title: "Usage",
    href: "/dashboard/usage",
    icon: BarChart3,
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
  {
    title: "Billing",
    href: "/dashboard/billing",
    icon: CreditCard,
  },
]

export function DashboardNav() {
  const pathname = usePathname()

  return (
    <nav className="flex overflow-x-auto lg:overflow-x-visible space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1 pb-2 lg:pb-0">
      {navItems.map((item) => (
        <Button
          key={item.href}
          asChild
          variant={pathname === item.href ? "default" : "ghost"}
          className="justify-start shrink-0 lg:shrink"
        >
          <Link href={item.href}>
            <item.icon className="mr-2 h-4 w-4" />
            <span className="whitespace-nowrap">{item.title}</span>
          </Link>
        </Button>
      ))}
    </nav>
  )
}
