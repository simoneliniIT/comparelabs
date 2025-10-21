import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Sparkles, GitCompare, Brain } from "lucide-react"
import Image from "next/image"

export function HeroSection() {
  return (
    <section className="text-center py-12 sm:py-16 md:py-20 lg:py-24 mb-12 sm:mb-16 md:mb-20 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-4 sm:mb-6 leading-tight text-balance">
          Get the <span className="gradient-text">best answer</span> from the{" "}
          <span className="gradient-text"> best AI models </span>
        </h1>

        <div className="relative mb-6 sm:mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-2xl blur-xl" />
          <div className="relative bg-background/80 backdrop-blur-sm border border-primary/20 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 max-w-3xl mx-auto">
            <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
              <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <p className="text-base sm:text-lg text-foreground leading-relaxed text-left">
                Sometimes you need to get the <span className="font-semibold text-primary">best possible answer</span>.
              </p>
            </div>

            <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
              <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <GitCompare className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <p className="text-base sm:text-lg text-foreground leading-relaxed text-left">
                Compare responses from <span className="font-semibold gradient-text">GPT-5</span>,{" "}
                <span className="font-semibold gradient-text">Claude Sonnet 4.5</span>,{" "}
                <span className="font-semibold gradient-text">Gemini 2.5 Pro</span>, and{" "}
                <span className="font-semibold gradient-text">Grok 4</span> and many more, side by side, with one
                subscription.
              </p>
            </div>

            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <p className="text-base sm:text-lg text-foreground leading-relaxed text-left">
                Get <span className="font-semibold text-primary">AI-powered summaries</span> and make better decisions
                with <span className="font-semibold text-primary">comprehensive insights</span>.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-12 sm:mb-16">
          <Link href="/auth/signup" className="w-full sm:w-auto">
            <Button
              size="lg"
              className="gradient-bg hover:opacity-90 text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 w-full sm:w-auto"
            >
              Try Free Now
            </Button>
          </Link>
        </div>

        <div className="bg-white rounded-xl py-6 sm:py-8 px-4">
          <div className="text-xs sm:text-sm text-muted-foreground mb-4">Using the best models from</div>
          <div className="flex flex-wrap justify-center items-center gap-8 sm:gap-10 md:gap-12 mt-3 sm:mt-4 opacity-70">
            <Image
              src="/logos/openai-logo.png"
              alt="OpenAI"
              width={120}
              height={40}
              className="h-10 sm:h-12 w-auto object-contain max-w-[120px] sm:max-w-[140px]"
            />
            <Image
              src="/logos/anthropic-logo.png"
              alt="Anthropic"
              width={120}
              height={40}
              className="h-10 sm:h-12 w-auto object-contain max-w-[140px] sm:max-w-[160px]"
            />
            <Image
              src="/logos/gemini-logo.png"
              alt="Google"
              width={120}
              height={40}
              className="h-10 sm:h-12 w-auto object-contain max-w-[120px] sm:max-w-[140px]"
            />
            <Image
              src="/logos/xai-logo.png"
              alt="xAI"
              width={120}
              height={40}
              className="h-10 sm:h-12 w-auto object-contain max-w-[120px] sm:max-w-[140px]"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
