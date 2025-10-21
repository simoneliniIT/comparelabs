import type React from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BarChart3, Users, ArrowLeft } from "lucide-react"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Check if user is admin
  const { data: adminUser } = await supabase.from("admin_users").select("*").eq("id", user.id).single()

  if (!adminUser) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <nav className="flex gap-2">
                <Link href="/admin/users">
                  <Button variant="ghost" size="sm">
                    <Users className="h-4 w-4 mr-2" />
                    Users
                  </Button>
                </Link>
                <Link href="/admin/cost-analytics">
                  <Button variant="ghost" size="sm">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Cost Analytics
                  </Button>
                </Link>
              </nav>
            </div>
            <div className="text-sm text-muted-foreground">Admin Panel</div>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-8">{children}</div>
    </div>
  )
}
