"use client"

interface MarkdownRendererProps {
  content: string
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  // Simple markdown-to-HTML converter for basic formatting
  const renderMarkdown = (text: string) => {
    if (!text || typeof text !== "string") {
      return '<p class="text-muted-foreground">No content available</p>'
    }

    let html = text

    // Tables
    html = html.replace(/^\|(.+)\|\s*\n\|[\s:|-]+\|\s*\n((?:\|.+\|\s*\n?)*)/gm, (match, header, rows) => {
      const headerCells = header
        .split("|")
        .map((cell: string) => cell.trim())
        .filter((cell: string) => cell)

      const rowsArray = rows
        .trim()
        .split("\n")
        .filter((row: string) => row.trim())
        .map((row: string) =>
          row
            .split("|")
            .map((cell: string) => cell.trim())
            .filter((cell: string) => cell),
        )

      let tableHtml =
        '<div class="overflow-x-auto my-4"><table class="min-w-full border-collapse border border-border">'

      tableHtml += '<thead class="bg-muted"><tr>'
      headerCells.forEach((cell: string) => {
        tableHtml += `<th class="border border-border px-4 py-2 text-left font-semibold">${cell}</th>`
      })
      tableHtml += "</tr></thead>"

      tableHtml += "<tbody>"
      rowsArray.forEach((row: string[]) => {
        tableHtml += '<tr class="hover:bg-muted/50">'
        row.forEach((cell: string) => {
          tableHtml += `<td class="border border-border px-4 py-2">${cell}</td>`
        })
        tableHtml += "</tr>"
      })
      tableHtml += "</tbody></table></div>"

      return tableHtml
    })

    // Headers (must be checked from most specific to least specific)
    html = html
      .replace(/^#### (.*$)/gim, '<h4 class="text-base font-semibold mt-3 mb-2">$1</h4>')
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-6 mb-3">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-6 mb-4">$1</h1>')

    // Markdown links: [text](url) - Process BEFORE auto-linking plain URLs
    html = html.replace(/\[([^\]]+)\]$$([^)]+)$$/g, (match, text, url) => {
      // Trim whitespace from URL
      const cleanUrl = url.trim()
      return `<a href="${cleanUrl}" class="text-primary hover:underline underline-offset-2 font-medium" target="_blank" rel="noopener noreferrer">${text}</a>`
    })

    // Auto-link plain URLs (but not if already inside an href or anchor tag)
    html = html.replace(/(?<!href=["']|">|<a [^>]*>)(https?:\/\/[^\s<]+[^\s<.,;:!?)\]]*)/g, (match) => {
      // Don't auto-link if this URL is already part of an anchor tag
      return `<a href="${match}" class="text-primary hover:underline underline-offset-2 font-medium break-all" target="_blank" rel="noopener noreferrer">${match}</a>`
    })

    // Bold and italic
    html = html
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong class="font-bold italic">$1</strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
      .replace(/___(.+?)___/g, '<strong class="font-bold italic">$1</strong>')
      .replace(/__(.+?)__/g, '<strong class="font-semibold">$1</strong>')
      .replace(/_(.+?)_/g, '<em class="italic">$1</em>')

    // Code blocks (with language support)
    html = html.replace(
      /```(\w+)?\n([\s\S]*?)```/g,
      '<pre class="bg-muted p-4 rounded-lg my-4 overflow-x-auto border border-border"><code class="text-sm font-mono">$2</code></pre>',
    )

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')

    // Blockquotes
    html = html.replace(
      /^> (.+$)/gim,
      '<blockquote class="border-l-4 border-primary pl-4 py-2 my-3 italic text-muted-foreground">$1</blockquote>',
    )

    // Horizontal rules
    html = html.replace(/^---$/gm, '<hr class="my-6 border-border" />')
    html = html.replace(/^\*\*\*$/gm, '<hr class="my-6 border-border" />')

    // Lists
    html = html
      .replace(/^\* (.+$)/gim, '<li class="ml-6 list-disc">$1</li>')
      .replace(/^- (.+$)/gim, '<li class="ml-6 list-disc">$1</li>')
      .replace(/^\+ (.+$)/gim, '<li class="ml-6 list-disc">$1</li>')
      .replace(/^\d+\. (.+$)/gim, '<li class="ml-6 list-decimal">$1</li>')

    // Wrap consecutive list items in ul/ol tags
    html = html.replace(/(<li class="ml-6 list-disc">.*?<\/li>\n?)+/g, (match) => {
      return `<ul class="my-3 space-y-1">${match}</ul>`
    })

    html = html.replace(/(<li class="ml-6 list-decimal">.*?<\/li>\n?)+/g, (match) => {
      return `<ol class="my-3 space-y-1">${match}</ol>`
    })

    // Line breaks and paragraphs
    html = html.replace(/\n\n/g, '</p><p class="mb-3">')

    // Wrap in paragraph if not already wrapped
    if (!html.startsWith("<")) {
      html = `<p class="mb-3">${html}</p>`
    }

    return html
  }

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <div dangerouslySetInnerHTML={{ __html: renderMarkdown(content || "") }} />
    </div>
  )
}
