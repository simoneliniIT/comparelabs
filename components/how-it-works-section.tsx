import Image from "next/image"
import { ArrowRight } from "lucide-react"

export function HowItWorksSection() {
  return (
    <section className="py-16 sm:py-20 md:py-24 mb-12 sm:mb-16">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-balance">
            How It <span className="gradient-text">Works</span>
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto text-balance">
            Get comprehensive AI insights in four simple steps
          </p>
        </div>

        <div className="space-y-16 sm:space-y-20 md:space-y-24">
          {/* Step 1: Ask Your Question */}
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="order-2 md:order-1">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-semibold mb-4">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">
                  1
                </span>
                Ask Your Question
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold mb-4">Start with Any Question</h3>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                Type your question into our intuitive interface. Whether it's complex research, creative writing, or
                technical problem-solving, our platform handles it all.
              </p>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <ArrowRight className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Simple, clean interface designed for focus</span>
                </li>
                <li className="flex items-start gap-3">
                  <ArrowRight className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Real-time credit cost calculation</span>
                </li>
                <li className="flex items-start gap-3">
                  <ArrowRight className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Full conversation history saved automatically</span>
                </li>
              </ul>
            </div>
            <div className="order-1 md:order-2">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border">
                <Image
                  src="/images/design-mode/question.png"
                  alt="Ask your question interface"
                  width={1200}
                  height={800}
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>

          {/* Step 2: Select Models */}
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="order-1">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border">
                <Image
                  src="/images/design-mode/model%20list.png"
                  alt="Select AI models"
                  width={1200}
                  height={800}
                  className="w-full h-auto"
                />
              </div>
            </div>
            <div className="order-2">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-semibold mb-4">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">
                  2
                </span>
                Choose Your Models
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold mb-4">Pick from 20+ Leading AI Models</h3>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                Select from performance powerhouses, balanced mid-tier options, or quick and efficient models. Mix and
                match to get diverse perspectives on your question.
              </p>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <ArrowRight className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-foreground">Performance tier:</strong> GPT-5, Claude Sonnet 4.5, Gemini 2.5
                    Pro, Grok 4
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <ArrowRight className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-foreground">Medium tier:</strong> Balanced capability and cost
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <ArrowRight className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-foreground">Quick tier:</strong> Fast, efficient responses
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Step 3: Compare Responses */}
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="order-2 md:order-1">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-semibold mb-4">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">
                  3
                </span>
                Compare Side by Side
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold mb-4">See Every Perspective at Once</h3>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                Watch as multiple AI models respond simultaneously. Each model brings unique strengths, reasoning
                styles, and insights to your question.
              </p>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <ArrowRight className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Real-time streaming from all selected models</span>
                </li>
                <li className="flex items-start gap-3">
                  <ArrowRight className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Clear visual indicators for completion status</span>
                </li>
                <li className="flex items-start gap-3">
                  <ArrowRight className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Copy individual responses with one click</span>
                </li>
              </ul>
            </div>
            <div className="order-1 md:order-2">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border">
                <Image
                  src="/images/design-mode/side%20by%20side.png"
                  alt="Compare responses side by side"
                  width={1200}
                  height={800}
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>

          {/* Step 4: Get Super Answer */}
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="order-1">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5">
                <Image
                  src="/images/design-mode/superanswer.png"
                  alt="The Super Answer - AI-powered synthesis"
                  width={1200}
                  height={800}
                  className="w-full h-auto"
                />
              </div>
            </div>
            <div className="order-2">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500/10 to-blue-500/10 text-primary px-4 py-2 rounded-full text-sm font-semibold mb-4">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs">
                  4
                </span>
                Get The Super Answer
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold mb-4">
                <span className="gradient-text">AI-Powered Synthesis</span> of All Responses
              </h3>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                Our advanced AI analyzes all model responses and creates a comprehensive "meta-answer" that combines the
                best insights, eliminates redundancies, and highlights unique perspectives.
              </p>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <ArrowRight className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-foreground">Intelligent synthesis:</strong> Combines the strongest points
                    from each model
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <ArrowRight className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-foreground">Comprehensive analysis:</strong> Detailed breakdown of unique
                    contributions
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <ArrowRight className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-foreground">Premium feature:</strong> The cornerstone of our platform
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
