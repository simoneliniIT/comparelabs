import { Header } from "@/components/header"
import { PlanSelectionCards } from "@/components/plan-selection-cards"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function ChoosePlanPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 sm:px-6 md:px-8 py-12 sm:py-14 md:py-16">
        <div className="text-center mb-12 sm:mb-14 md:mb-16">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">🎉 Welcome to CompareLabs!</h1>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
            Choose a plan to get started. You can always upgrade later.
          </p>
        </div>

        <PlanSelectionCards userId={user?.id || null} />

        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm text-muted-foreground">
            ✨ All plans include access to all AI models. Credits are the only difference.
          </p>
        </div>
      </main>
    </div>
  )
}
