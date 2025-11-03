import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { HeroSection } from "@/components/hero-section"
import { TryItFreeSection } from "@/components/try-it-free-section"
import { HowItWorksSection } from "@/components/how-it-works-section"
import { ModelShowcase } from "@/components/model-showcase"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <HeroSection />
        <TryItFreeSection />
        <HowItWorksSection />
        <ModelShowcase />

        <div className="text-center py-16">
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of users who are already comparing AI models to get the best results for their projects.
          </p>
          <div className="flex items-center justify-center">
            <Button asChild size="lg" className="gradient-bg hover:opacity-90">
              <Link href="/auth/signup">Get Started Free</Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
