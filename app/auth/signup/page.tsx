"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function SignupPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showEmailSent, setShowEmailSent] = useState(false)
  const router = useRouter()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long")
      setIsLoading(false)
      return
    }

    try {
      const isLocalhost = typeof window !== "undefined" && window.location.hostname === "localhost"
      const redirectUrl = isLocalhost
        ? `${window.location.origin}/auth/callback`
        : "https://comparelabs.ai/auth/callback"

      console.log("[v0] Attempting signup with email:", email)
      console.log("[v0] Redirect URL:", redirectUrl)

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          },
        },
      })

      console.log("[v0] Signup response:", {
        userExists: !!data?.user,
        userId: data?.user?.id,
        userEmail: data?.user?.email,
        emailConfirmed: data?.user?.email_confirmed_at,
        identities: data?.user?.identities?.length,
        error: signUpError?.message,
      })

      if (signUpError) {
        console.error("[v0] Supabase signup error details:", {
          name: signUpError.name,
          message: signUpError.message,
          status: (signUpError as any).status,
          code: (signUpError as any).code,
        })
      }

      if (data?.user) {
        // User was created successfully
        console.log("[v0] User created successfully - ID:", data.user.id)

        // Check if email confirmation is required
        if (!data.user.email_confirmed_at) {
          console.log("[v0] Email confirmation required - confirmation email should have been sent to:", email)
          setShowEmailSent(true)
          setIsLoading(false)
          return
        } else {
          console.log("[v0] Email already confirmed or confirmation not required")
          router.push("/auth/choose-plan")
          return
        }
      }

      if (signUpError) {
        const errorMessage = signUpError.message.toLowerCase()

        if (errorMessage.includes("already registered") || errorMessage.includes("already exists")) {
          setError("An account with this email already exists. Please sign in instead.")
          setIsLoading(false)
          return
        }

        if (errorMessage.includes("rate limit")) {
          console.error("[v0] Rate limit hit - check Supabase email rate limit settings")
          setError("Too many signup attempts. Please wait a minute and try again.")
        } else if (errorMessage.includes("email") || errorMessage.includes("mail")) {
          console.error("[v0] Email sending failed - check Supabase SMTP configuration")
          setError("Unable to send confirmation email. Please contact support.")
        } else {
          setError(signUpError.message)
        }
        setIsLoading(false)
        return
      }

      console.error("[v0] Unexpected signup state - no user and no error")
      setError("An unexpected error occurred. Please try again.")
    } catch (error: unknown) {
      console.error("[v0] Signup exception:", error)
      setError(error instanceof Error ? error.message : "An error occurred during signup")
    } finally {
      setIsLoading(false)
    }
  }

  if (showEmailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-6">
        <div className="w-full max-w-md">
          <Card className="shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
              <CardDescription>We've sent a confirmation link to {email}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground space-y-2">
                <p>Click the link in the email to confirm your account and complete signup.</p>
                <p className="font-medium">Didn't receive the email?</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Check your spam folder</li>
                  <li>Wait a few minutes for the email to arrive</li>
                  <li>Make sure you entered the correct email address</li>
                </ul>
              </div>
              <div className="pt-4 text-center text-sm">
                <Link href="/auth/login" className="font-medium text-primary hover:underline">
                  Back to sign in
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-6">
      <div className="w-full max-w-md">
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
            <CardDescription>Join CompareLabs.ai to start comparing AI models with advanced features</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Please double-check your email address. We'll send a verification email to complete your signup.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 6 characters"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creating account..." : "Create account"}
              </Button>
            </form>
            <div className="mt-6 text-center text-sm">
              Already have an account?{" "}
              <Link href="/auth/login" className="font-medium text-primary hover:underline">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
