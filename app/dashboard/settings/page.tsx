"use client"

export const dynamic = "force-dynamic"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { User, Bell, Shield, Trash2, Brain } from "lucide-react"
import { AI_MODELS } from "@/lib/ai-config"
import type { User as SupabaseUser } from "@supabase/supabase-js"

export default function SettingsPage() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [usageAlerts, setUsageAlerts] = useState(true)
  const [summaryModel, setSummaryModel] = useLocalStorage<string>("summary-model", "chatgpt")
  const { toast } = useToast()

  useEffect(() => {
    const supabase = createClient()

    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        setEmail(user.email || "")
        setFullName(user.user_metadata?.full_name || "")

        // Get profile data
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

        if (profile) {
          setProfile(profile)
          setEmailNotifications(profile.email_notifications ?? true)
          setUsageAlerts(profile.usage_alerts ?? true)
        }
      }
      setLoading(false)
    }

    getUser()
  }, [])

  const handleSaveProfile = async () => {
    if (!user) return

    const supabase = createClient()
    setSaving(true)
    try {
      // Update auth metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: fullName },
      })

      if (authError) throw authError

      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          email_notifications: emailNotifications,
          usage_alerts: usageAlerts,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (profileError) throw profileError

      toast({
        title: "Settings saved",
        description: "Your profile settings have been updated successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    const supabase = createClient()
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) throw error

      toast({
        title: "Password reset sent",
        description: "Check your email for password reset instructions.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send password reset email.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Account Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences and security settings.</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>Update your personal information and display preferences.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" value={email} disabled className="bg-muted" />
              <p className="text-sm text-muted-foreground">
                Email address cannot be changed. Contact support if needed.
              </p>
            </div>
            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Preferences
            </CardTitle>
            <CardDescription>Configure how AI models are used in your comparisons.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="summaryModel">Summarization Model</Label>
              <Select value={summaryModel} onValueChange={setSummaryModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a model for generating summaries" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(AI_MODELS).map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded ${model.gradient}`}></div>
                        <span>{model.name}</span>
                        <span className="text-muted-foreground text-sm">({model.description})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Choose which AI model to use for generating comparison summaries. This setting is saved locally in your
                browser.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>Choose what notifications you'd like to receive.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive updates about your account and usage</p>
              </div>
              <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Usage Alerts</Label>
                <p className="text-sm text-muted-foreground">Get notified when approaching usage limits</p>
              </div>
              <Switch checked={usageAlerts} onCheckedChange={setUsageAlerts} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security
            </CardTitle>
            <CardDescription>Manage your account security and password.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Password</Label>
                <p className="text-sm text-muted-foreground">
                  Last updated: {profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString() : "Never"}
                </p>
              </div>
              <Button variant="outline" onClick={handleChangePassword}>
                Change Password
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>Irreversible actions that will affect your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Delete Account</Label>
                <p className="text-sm text-muted-foreground">Permanently delete your account and all associated data</p>
              </div>
              <Button variant="destructive" disabled>
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
