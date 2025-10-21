"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { useEffect, useState, useRef, useCallback } from "react"
import { LogOut, Settings, CreditCard, Sparkles } from "lucide-react"

export function UserNav() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const lastUserRef = useRef<any>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const updateUser = useCallback((newUser: any, event: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      const userChanged = JSON.stringify(lastUserRef.current) !== JSON.stringify(newUser)

      if (userChanged) {
        setUser(newUser)
        lastUserRef.current = newUser
      }
    }, 100)
  }, [])

  useEffect(() => {
    setMounted(true)

    const getUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        setUser(user)
        lastUserRef.current = user
      } catch (error) {
        console.error("Error getting user:", error)
        setUser(null)
        lastUserRef.current = null
      } finally {
        setLoading(false)
      }
    }

    getUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const newUser = session?.user || null
      updateUser(newUser, event)
    })

    return () => {
      subscription.unsubscribe()
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [updateUser])

  if (!mounted || loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-8 w-16 bg-muted animate-pulse rounded" />
        <div className="h-8 w-16 bg-muted animate-pulse rounded" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost">
          <a href="/auth/login">Sign In</a>
        </Button>
        <Button asChild>
          <a href="/auth/signup">Sign Up</a>
        </Button>
      </div>
    )
  }

  const getInitials = (fullName: string | null | undefined, email: string | null | undefined) => {
    if (fullName) {
      const names = fullName.trim().split(" ")
      if (names.length >= 2) {
        return (names[0][0] + names[names.length - 1][0]).toUpperCase()
      } else if (names.length === 1) {
        return names[0].substring(0, 2).toUpperCase()
      }
    }
    return email?.[0]?.toUpperCase() || "U"
  }

  const initials = getInitials(user.user_metadata?.full_name, user.email)
  const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "User"

  const handleSignOut = async () => {
    console.log("[v0] Sign out clicked")
    try {
      await supabase.auth.signOut()
      router.push("/")
      router.refresh()
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  return (
    <DropdownMenu
      modal={false}
      open={isOpen}
      onOpenChange={(open) => {
        console.log("[v0] Dropdown onOpenChange:", open)
        setIsOpen(open)
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 h-auto px-3 py-2 rounded-md hover:bg-accent transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={(e) => {
            console.log("[v0] Trigger button clicked", e.target)
          }}
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline-block text-sm font-medium">{displayName}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56"
        sideOffset={8}
        onCloseAutoFocus={(e) => {
          console.log("[v0] Dropdown onCloseAutoFocus")
        }}
        onEscapeKeyDown={(e) => {
          console.log("[v0] Dropdown onEscapeKeyDown")
        }}
        onPointerDownOutside={(e) => {
          console.log("[v0] Dropdown onPointerDownOutside", e.target)
        }}
        onInteractOutside={(e) => {
          console.log("[v0] Dropdown onInteractOutside", e.target)
        }}
      >
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            console.log("[v0] Compare Models menu item selected")
            router.push("/compare")
          }}
          className="cursor-pointer"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          <span>Compare Models</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            console.log("[v0] Dashboard menu item selected")
            router.push("/dashboard")
          }}
          className="cursor-pointer"
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>Dashboard</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            console.log("[v0] Billing menu item selected")
            router.push("/dashboard/billing")
          }}
          className="cursor-pointer"
        >
          <CreditCard className="mr-2 h-4 w-4" />
          <span>Billing</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleSignOut} className="text-red-600 focus:text-red-600 cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
