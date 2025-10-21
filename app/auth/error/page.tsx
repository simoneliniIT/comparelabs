import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { AlertCircle } from "lucide-react"

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; error_description?: string }>
}) {
  const params = await searchParams

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-6">
      <div className="w-full max-w-md">
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold text-destructive">Authentication Error</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {params?.error_description ? (
              <p className="text-sm text-muted-foreground">{params.error_description}</p>
            ) : params?.error ? (
              <p className="text-sm text-muted-foreground">Error: {params.error}</p>
            ) : (
              <p className="text-sm text-muted-foreground">An unexpected authentication error occurred.</p>
            )}
            <div className="space-y-2">
              <Button asChild className="w-full">
                <Link href="/auth/login">Try Again</Link>
              </Button>
              <Button asChild variant="outline" className="w-full bg-transparent">
                <Link href="/">Back to Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
