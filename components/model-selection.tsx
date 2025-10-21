"use client"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AI_MODELS, getModelsByBucket } from "@/lib/ai-config"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface ModelSelectionProps {
  selectedModels: string[]
  onSelectionChange: (models: string[]) => void
  enableSummarization: boolean
  onSummarizationChange: (enabled: boolean) => void
  summarizationModel: string
  onSummarizationModelChange: (model: string) => void
}

export function ModelSelection({
  selectedModels,
  onSelectionChange,
  enableSummarization,
  onSummarizationChange,
  summarizationModel,
  onSummarizationModelChange,
}: ModelSelectionProps) {
  const models = Object.values(AI_MODELS)

  const performanceModels = getModelsByBucket("performance")
  const mediumModels = getModelsByBucket("medium")
  const quickModels = getModelsByBucket("quick")

  const toggleModel = (modelId: string) => {
    const newSelection = selectedModels.includes(modelId)
      ? selectedModels.filter((id) => id !== modelId)
      : [...selectedModels, modelId]

    onSelectionChange(newSelection)
  }

  const selectAllInBucket = (bucket: "performance" | "medium" | "quick") => {
    const bucketModels = getModelsByBucket(bucket)
    const bucketModelIds = bucketModels.map((m) => m.id)

    const allSelected = bucketModelIds.every((id) => selectedModels.includes(id))

    if (allSelected) {
      onSelectionChange(selectedModels.filter((id) => !bucketModelIds.includes(id)))
    } else {
      const newSelection = [...selectedModels]
      bucketModelIds.forEach((id) => {
        if (!newSelection.includes(id)) {
          newSelection.push(id)
        }
      })
      onSelectionChange(newSelection)
    }
  }

  const renderModelCard = (model: any) => (
    <div
      key={model.id}
      className={`bg-card border rounded-xl p-3 sm:p-4 cursor-pointer transition-all duration-200 ${
        selectedModels.includes(model.id) ? "border-primary glow-purple" : "border-border hover:border-primary/50"
      }`}
      onClick={() => toggleModel(model.id)}
    >
      <div className="flex items-center space-x-2 sm:space-x-3">
        <Checkbox checked={selectedModels.includes(model.id)} onChange={() => toggleModel(model.id)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1 flex-wrap">
            <span className="text-base sm:text-lg">{model.icon}</span>
            <div className="font-medium text-sm sm:text-base truncate">{model.name}</div>
            {model.bucket !== "free" && (
              <Badge variant={model.bucket === "pro" ? "default" : "secondary"} className="text-xs">
                {model.bucket}
              </Badge>
            )}
          </div>
          <div className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{model.description}</div>
        </div>
      </div>
    </div>
  )

  const areAllSelectedInBucket = (bucket: "performance" | "medium" | "quick") => {
    const bucketModels = getModelsByBucket(bucket)
    return bucketModels.every((m) => selectedModels.includes(m.id))
  }

  return (
    <section className="mb-8 sm:mb-10 md:mb-12 w-full max-w-full">
      <div className="mb-4 sm:mb-6">
        <h3 className="text-lg sm:text-xl font-semibold break-words">Select Models to Compare</h3>
      </div>

      <div className="space-y-5 sm:space-y-6 w-full max-w-full">
        {/* Performance Models */}
        <div className="w-full max-w-full">
          <div className="flex items-center justify-between mb-2 sm:mb-3 gap-2">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <h4 className="text-xs sm:text-sm font-medium text-muted-foreground break-words">
                ⚡ Performance (frontier reasoning + strongest outputs)
              </h4>
              <Badge variant="secondary" className="text-xs flex-shrink-0">
                25 credits
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => selectAllInBucket("performance")}
              className="text-xs h-8 flex-shrink-0 whitespace-nowrap"
            >
              {areAllSelectedInBucket("performance") ? "Deselect All" : "Select All"}
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 w-full max-w-full">
            {performanceModels.map(renderModelCard)}
          </div>
        </div>

        {/* Medium Models */}
        {mediumModels.length > 0 && (
          <div className="w-full max-w-full">
            <div className="flex items-center justify-between mb-2 sm:mb-3 gap-2">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <h4 className="text-xs sm:text-sm font-medium text-muted-foreground break-words">
                  ⚖️ Medium (solid capability, balanced pricing)
                </h4>
                <Badge variant="secondary" className="text-xs flex-shrink-0">
                  5 credits
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectAllInBucket("medium")}
                className="text-xs h-8 flex-shrink-0 whitespace-nowrap"
              >
                {areAllSelectedInBucket("medium") ? "Deselect All" : "Select All"}
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 w-full max-w-full">
              {mediumModels.map(renderModelCard)}
            </div>
          </div>
        )}

        {/* Quick & Cheap Models */}
        {quickModels.length > 0 && (
          <div className="w-full max-w-full">
            <div className="flex items-center justify-between mb-2 sm:mb-3 gap-2">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <h4 className="text-xs sm:text-sm font-medium text-muted-foreground break-words">
                  ⚡ Quick & Cheap (best efficiency / scale)
                </h4>
                <Badge variant="secondary" className="text-xs flex-shrink-0">
                  1 credit
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectAllInBucket("quick")}
                className="text-xs h-8 flex-shrink-0 whitespace-nowrap"
              >
                {areAllSelectedInBucket("quick") ? "Deselect All" : "Select All"}
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 w-full max-w-full">
              {quickModels.map(renderModelCard)}
            </div>
          </div>
        )}
      </div>

      <div className="bg-card border rounded-xl p-4 sm:p-5 md:p-6 mt-5 sm:mt-6 w-full max-w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start sm:items-center space-x-3 min-w-0">
            <Checkbox
              checked={enableSummarization}
              onCheckedChange={onSummarizationChange}
              className="mt-1 sm:mt-0 flex-shrink-0"
            />
            <div className="min-w-0">
              <div className="font-medium text-sm sm:text-base break-words">Generate AI Summary</div>
              <div className="text-xs sm:text-sm text-muted-foreground break-words">
                Have one model summarize and compare all responses (+1 credit)
              </div>
            </div>
          </div>

          {enableSummarization && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
              <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">Summarization model:</span>
              <Select value={summarizationModel} onValueChange={onSummarizationModelChange}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.icon} {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
