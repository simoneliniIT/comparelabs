import type { ModelResponse } from "@/lib/api-client"

export interface ExportData {
  timestamp: string
  prompt: string
  responses: ModelResponse[]
  summary: string
  followUpResponses?: Record<string, ModelResponse[]>
}

function convertMarkdownToHTML(text: string): string {
  if (!text || typeof text !== "string") {
    return '<p style="color: #999;">No content available</p>'
  }

  let html = text

  // Headers (from most specific to least specific)
  html = html
    .replace(
      /^#### (.*$)/gim,
      '<h4 style="font-size: 14px; font-weight: 600; margin: 12px 0 8px 0; color: #333;">$1</h4>',
    )
    .replace(
      /^### (.*$)/gim,
      '<h3 style="font-size: 16px; font-weight: 600; margin: 16px 0 10px 0; color: #333;">$1</h3>',
    )
    .replace(
      /^## (.*$)/gim,
      '<h2 style="font-size: 18px; font-weight: 600; margin: 20px 0 12px 0; color: #333;">$1</h2>',
    )
    .replace(
      /^# (.*$)/gim,
      '<h1 style="font-size: 20px; font-weight: 700; margin: 24px 0 16px 0; color: #333;">$1</h1>',
    )

  // Bold and italic
  html = html
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong style="font-weight: 700; font-style: italic;">$1</strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight: 600;">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em style="font-style: italic;">$1</em>')
    .replace(/___(.+?)___/g, '<strong style="font-weight: 700; font-style: italic;">$1</strong>')
    .replace(/__(.+?)__/g, '<strong style="font-weight: 600;">$1</strong>')
    .replace(/_(.+?)_/g, '<em style="font-style: italic;">$1</em>')

  // Code blocks
  html = html.replace(
    /```(\w+)?\n([\s\S]*?)```/g,
    '<pre style="background: #f5f5f5; padding: 12px; border-radius: 6px; margin: 12px 0; overflow-x: auto; border: 1px solid #ddd;"><code style="font-size: 13px; font-family: monospace;">$2</code></pre>',
  )

  // Inline code
  html = html.replace(
    /`([^`]+)`/g,
    '<code style="background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-size: 13px; font-family: monospace;">$1</code>',
  )

  // Blockquotes
  html = html.replace(
    /^> (.+$)/gim,
    '<blockquote style="border-left: 4px solid #0066cc; padding-left: 16px; margin: 12px 0; font-style: italic; color: #666;">$1</blockquote>',
  )

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;" />')
  html = html.replace(/^\*\*\*$/gm, '<hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;" />')

  // Lists
  html = html
    .replace(/^\* (.+$)/gim, '<li style="margin-left: 24px; list-style-type: disc;">$1</li>')
    .replace(/^- (.+$)/gim, '<li style="margin-left: 24px; list-style-type: disc;">$1</li>')
    .replace(/^\+ (.+$)/gim, '<li style="margin-left: 24px; list-style-type: disc;">$1</li>')
    .replace(/^\d+\. (.+$)/gim, '<li style="margin-left: 24px; list-style-type: decimal;">$1</li>')

  // Wrap consecutive list items in ul/ol tags
  html = html.replace(/(<li style="margin-left: 24px; list-style-type: disc;">.*?<\/li>\n?)+/g, (match) => {
    return `<ul style="margin: 12px 0;">${match}</ul>`
  })

  html = html.replace(/(<li style="margin-left: 24px; list-style-type: decimal;">.*?<\/li>\n?)+/g, (match) => {
    return `<ol style="margin: 12px 0;">${match}</ol>`
  })

  // Line breaks and paragraphs
  html = html.replace(/\n\n/g, '</p><p style="margin-bottom: 12px; line-height: 1.6;">')

  // Wrap in paragraph if not already wrapped
  if (!html.startsWith("<")) {
    html = `<p style="margin-bottom: 12px; line-height: 1.6;">${html}</p>`
  }

  return html
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

  console.log("[v0] ========== PDF CONTENT GENERATION ==========")
  console.log("[v0] Summary value:", summary)
  console.log("[v0] Summary length:", summary?.length || 0)
  console.log("[v0] Will include summary section:", !!summary)
  console.log("[v0] ===============================================")

  let content = `<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">`

  // Header
  content += `<div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px;">`
  content += `<h1 style="color: #333; margin: 0;">CompareLabs.ai - AI Model Comparison</h1>`
  content += `<p style="color: #666; margin: 10px 0 0 0;">Generated: ${new Date(timestamp).toLocaleString()}</p>`
  content += `</div>`

  // Prompt
  content += `<div style="margin-bottom: 30px; background: #f8f9fa; padding: 20px; border-radius: 8px;">`
  content += `<h2 style="color: #333; margin: 0 0 10px 0; font-size: 18px;">Prompt</h2>`
  content += `<p style="margin: 0; font-style: italic; color: #555;">${prompt || "No prompt available"}</p>`
  content += `</div>`

  // Summary
  if (summary) {
    content += `<div style="margin-bottom: 30px; background: #e8f4fd; padding: 20px; border-radius: 8px; border-left: 4px solid #0066cc;">`
    content += `<h2 style="color: #0066cc; margin: 0 0 15px 0; font-size: 18px;">AI Summary</h2>`
    content += `<div style="color: #333; line-height: 1.6;">${convertMarkdownToHTML(summary)}</div>`
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
      content += `<div style="color: #333; line-height: 1.6;">${convertMarkdownToHTML(response.response)}</div>`

      // Add follow-up responses if any
      const followUps = followUpResponses[response.modelId] || []
      if (followUps.length > 0) {
        content += `<div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd;">`
        content += `<h4 style="color: #666; margin: 0 0 10px 0; font-size: 14px;">Follow-up Responses:</h4>`
        followUps.forEach((followUp, idx) => {
          content += `<div style="margin-bottom: 10px; padding: 10px; background: white; border-radius: 4px; font-size: 14px;">`
          content += `<strong>${idx + 1}.</strong> ${convertMarkdownToHTML(followUp.response)}`
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
