import type { ModelResponse } from "@/lib/api-client"

export interface ExportData {
  timestamp: string
  prompt: string
  responses: ModelResponse[]
  summary: string
  followUpResponses?: Record<string, ModelResponse[]>
}

export function formatForClipboard(data: ExportData): string {
  const { timestamp, prompt, responses, summary, followUpResponses = {} } = data

  let output = `# CompareLabs.ai - AI Model Comparison\n\n`
  output += `**Generated:** ${new Date(timestamp).toLocaleString()}\n\n`
  output += `**Prompt:** ${prompt}\n\n`

  if (summary) {
    output += `## AI Summary\n\n${summary}\n\n`
  }

  output += `## Model Responses\n\n`

  responses.forEach((response, index) => {
    output += `### ${response.modelName}\n\n`

    if (response.success) {
      output += `${response.response}\n\n`

      // Add follow-up responses if any
      const followUps = followUpResponses[response.modelId] || []
      if (followUps.length > 0) {
        output += `**Follow-up responses:**\n\n`
        followUps.forEach((followUp, idx) => {
          output += `${idx + 1}. ${followUp.response}\n\n`
        })
      }
    } else {
      output += `❌ **Error:** ${response.error || "Unknown error occurred"}\n\n`
    }

    if (index < responses.length - 1) {
      output += `---\n\n`
    }
  })

  return output
}

export function formatForEmail(data: ExportData): { subject: string; body: string } {
  const { timestamp, prompt, responses, summary } = data

  const subject = `CompareLabs.ai Comparison Results - ${new Date(timestamp).toLocaleDateString()}`

  let body = `Hi,\n\n`
  body += `I've generated an AI model comparison using CompareLabs.ai. Here are the results:\n\n`
  body += `Prompt: "${prompt}"\n`
  body += `Generated: ${new Date(timestamp).toLocaleString()}\n\n`

  if (summary) {
    body += `SUMMARY:\n${summary}\n\n`
  }

  body += `MODEL RESPONSES:\n\n`

  responses.forEach((response, index) => {
    body += `${index + 1}. ${response.modelName}:\n`
    if (response.success) {
      body += `${response.response}\n\n`
    } else {
      body += `Error: ${response.error || "Unknown error occurred"}\n\n`
    }
  })

  body += `Generated with CompareLabs.ai - AI Model Comparison Tool\n`

  return { subject, body }
}

export function generatePDFContent(data: ExportData): string {
  const { timestamp, prompt, responses, summary, followUpResponses = {} } = data

  let content = `<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">`

  // Header
  content += `<div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px;">`
  content += `<h1 style="color: #333; margin: 0;">CompareLabs.ai - AI Model Comparison</h1>`
  content += `<p style="color: #666; margin: 10px 0 0 0;">Generated: ${new Date(timestamp).toLocaleString()}</p>`
  content += `</div>`

  // Prompt
  content += `<div style="margin-bottom: 30px; background: #f8f9fa; padding: 20px; border-radius: 8px;">`
  content += `<h2 style="color: #333; margin: 0 0 10px 0; font-size: 18px;">Prompt</h2>`
  content += `<p style="margin: 0; font-style: italic; color: #555;">"${prompt}"</p>`
  content += `</div>`

  // Summary
  if (summary) {
    content += `<div style="margin-bottom: 30px; background: #e8f4fd; padding: 20px; border-radius: 8px; border-left: 4px solid #0066cc;">`
    content += `<h2 style="color: #0066cc; margin: 0 0 15px 0; font-size: 18px;">AI Summary</h2>`
    content += `<div style="color: #333; line-height: 1.6;">${summary.replace(/\n/g, "<br>")}</div>`
    content += `</div>`
  }

  // Model Responses
  content += `<h2 style="color: #333; margin: 30px 0 20px 0; font-size: 20px;">Model Responses</h2>`

  responses.forEach((response, index) => {
    const bgColor = response.success ? "#f8f9fa" : "#fff5f5"
    const borderColor = response.success ? "#28a745" : "#dc3545"

    content += `<div style="margin-bottom: 25px; background: ${bgColor}; padding: 20px; border-radius: 8px; border-left: 4px solid ${borderColor};">`
    content += `<h3 style="color: #333; margin: 0 0 15px 0; font-size: 16px; display: flex; align-items: center;">`
    content += `<span style="margin-right: 10px;">${response.success ? "✅" : "❌"}</span>`
    content += `${response.modelName}`
    content += `</h3>`

    if (response.success) {
      content += `<div style="color: #333; line-height: 1.6; white-space: pre-wrap;">${response.response}</div>`

      // Add follow-up responses if any
      const followUps = followUpResponses[response.modelId] || []
      if (followUps.length > 0) {
        content += `<div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd;">`
        content += `<h4 style="color: #666; margin: 0 0 10px 0; font-size: 14px;">Follow-up Responses:</h4>`
        followUps.forEach((followUp, idx) => {
          content += `<div style="margin-bottom: 10px; padding: 10px; background: white; border-radius: 4px; font-size: 14px;">`
          content += `<strong>${idx + 1}.</strong> ${followUp.response}`
          content += `</div>`
        })
        content += `</div>`
      }
    } else {
      content += `<div style="color: #dc3545; font-weight: 500;">Error: ${response.error || "Unknown error occurred"}</div>`
    }

    content += `</div>`
  })

  // Footer
  content += `<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 12px;">`
  content += `Generated with CompareLabs.ai - AI Model Comparison Tool`
  content += `</div>`

  content += `</div>`

  return content
}
