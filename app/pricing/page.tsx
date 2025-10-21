import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PricingCards } from "@/components/pricing-cards"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function PricingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let userTier = null
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("subscription_tier").eq("id", user.id).single()
    userTier = profile?.subscription_tier || null
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 sm:px-6 md:px-8 py-12 sm:py-14 md:py-16">
        <div className="text-center mb-12 sm:mb-14 md:mb-16">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">💡 Pricing made simple</h1>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
            Choose a plan, get credits every month, and spend them on the models you need.
          </p>
        </div>

        <PricingCards userId={user?.id || null} userTier={userTier} />

        <div className="max-w-3xl mx-auto mb-12 sm:mb-14 md:mb-16">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">🔑 How credits work</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm">• Every question you ask deducts credits</p>
                <p className="text-sm">
                  • Costs depend on the model: <strong>Top = 25 credits</strong>, <strong>Medium = 5 credits</strong>,{" "}
                  <strong>Quick = 1 credit</strong>
                </p>
                <p className="text-sm">• If you ask 1 question to 4 models, you'll spend credits for all 4 answers</p>
                <p className="text-sm">• Credits reset each month on your plan renewal date</p>
              </div>
              <div className="pt-4 border-t">
                <p className="text-sm font-medium">
                  ✨ No hidden fees, no confusing usage meters — just credits you can use however you like.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 sm:mt-14 md:mt-16 text-center">
          <h2 className="text-xl sm:text-2xl font-bold mb-6 sm:mb-8">Frequently Asked Questions</h2>
          <div className="grid gap-5 sm:gap-6 grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto text-left">
            <div>
              <h3 className="font-semibold mb-2">Can I change plans anytime?</h3>
              <p className="text-muted-foreground">
                Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">What happens if I run out of credits?</h3>
              <p className="text-muted-foreground">
                Your comparisons will be paused until your credits reset monthly or you upgrade your plan.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Do credits roll over?</h3>
              <p className="text-muted-foreground">
                Credits reset on your plan renewal date. Remaining credits do not carry over to the next month.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">How do multi-model comparisons work?</h3>
              <p className="text-muted-foreground">
                If you compare the same question across multiple models, you pay the credit cost for each model. For
                example: 1 Top + 2 Medium + 1 Quick = 25 + 10 + 1 = 36 credits.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
