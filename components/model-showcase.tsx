import Image from "next/image"

export function ModelShowcase() {
  const models = [
    // Performance tier
    {
      name: "GPT-5",
      description: "OpenAI's most advanced reasoning model",
      gradient: "chatgpt-gradient",
      logo: "/logos/openai-logo.png",
      tier: "Performance",
    },
    {
      name: "Gemini 2.5 Pro",
      description: "Google's flagship multimodal AI",
      gradient: "gemini-gradient",
      logo: "/logos/gemini-logo.png",
      tier: "Performance",
    },
    {
      name: "Claude Sonnet 4.5",
      description: "Anthropic's most capable model",
      gradient: "claude-gradient",
      logo: "/logos/anthropic-logo.png",
      tier: "Performance",
    },
    {
      name: "Grok 4",
      description: "xAI's frontier reasoning model",
      gradient: "grok-gradient",
      logo: "/logos/xai-logo.png",
      tier: "Performance",
    },
    // Medium tier
    {
      name: "GPT-5 Mini",
      description: "Fast and efficient OpenAI model",
      gradient: "chatgpt-gradient",
      logo: "/logos/openai-logo.png",
      tier: "Medium",
    },
    {
      name: "Gemini 2.5 Flash",
      description: "Google's balanced performance model",
      gradient: "gemini-gradient",
      logo: "/logos/gemini-logo.png",
      tier: "Medium",
    },
    {
      name: "DeepSeek v3.2",
      description: "DeepSeek's latest reasoning model",
      gradient: "deepseek-gradient",
      logo: "/logos/deepseek-logo.png",
      tier: "Medium",
    },
    {
      name: "Claude 3.5 Haiku",
      description: "Anthropic's fast and efficient model",
      gradient: "claude-gradient",
      logo: "/logos/anthropic-logo.png",
      tier: "Medium",
    },
    // Quick & Cheap tier
    {
      name: "Llama 4 Maverick",
      description: "Meta's open-source powerhouse",
      gradient: "llama-gradient",
      logo: "/logos/meta-logo.png",
      tier: "Quick & Cheap",
    },
    {
      name: "Grok 4 Fast",
      description: "xAI's ultra-fast reasoning model",
      gradient: "grok-gradient",
      logo: "/logos/xai-logo.png",
      tier: "Quick & Cheap",
    },
    {
      name: "Gemini 2.5 Flash Lite",
      description: "Google's most efficient model",
      gradient: "gemini-gradient",
      logo: "/logos/gemini-logo.png",
      tier: "Quick & Cheap",
    },
    {
      name: "GPT-4.1 Nano",
      description: "OpenAI's ultra-efficient model",
      gradient: "chatgpt-gradient",
      logo: "/logos/openai-logo.png",
      tier: "Quick & Cheap",
    },
  ]

  const tiers = [
    { name: "Performance", description: "Frontier reasoning + strongest outputs" },
    { name: "Medium", description: "Solid capability, balanced pricing" },
    { name: "Quick & Cheap", description: "Best efficiency / scale" },
  ]

  return (
    <section id="models" className="mb-12 sm:mb-16 md:mb-20 px-4">
      <div className="text-center mb-8 sm:mb-10 md:mb-12">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 text-balance">
          Compare 12 Leading AI Models
        </h2>
        <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
          Get responses from the world's most advanced AI models across all performance tiers
        </p>
      </div>

      {tiers.map((tier) => (
        <div key={tier.name} className="mb-8 sm:mb-10 md:mb-12">
          <div className="text-center mb-4 sm:mb-5 md:mb-6">
            <h3 className="text-xl sm:text-2xl font-semibold mb-2">{tier.name}</h3>
            <p className="text-sm sm:text-base text-muted-foreground">{tier.description}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
            {models
              .filter((model) => model.tier === tier.name)
              .map((model, index) => (
                <div
                  key={model.name}
                  className="bg-card border border-border rounded-xl p-4 sm:p-5 md:p-6 hover:border-primary/50 transition-all duration-300 float-animation"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center mb-3 sm:mb-4 relative">
                    <Image
                      src={model.logo || "/placeholder.svg"}
                      alt={`${model.name} logo`}
                      width={48}
                      height={48}
                      className="object-contain"
                    />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold mb-1 sm:mb-2">{model.name}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">{model.description}</p>
                </div>
              ))}
          </div>
        </div>
      ))}
    </section>
  )
}
