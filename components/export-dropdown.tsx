"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Download, FileText, Mail, Copy, Loader2 } from "lucide-react"
import { type ExportData, formatForClipboard, formatForEmail, generatePDFContent } from "@/lib/export-utils"
import { toast } from "sonner"

interface ExportDropdownProps {
  data: ExportData
  disabled?: boolean
}

export function ExportDropdown({ data, disabled = false }: ExportDropdownProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleCopyToClipboard = async () => {
    try {
      const formattedText = formatForClipboard(data)
      await navigator.clipboard.writeText(formattedText)
      toast.success("Copied to clipboard", {
        description: "All responses have been copied to your clipboard.",
      })
    } catch (error) {
      console.error("[v0] Copy to clipboard failed:", error)
      toast.error("Copy failed", {
        description: "Failed to copy to clipboard. Please try again.",
      })
    }
  }

  const handleEmailExport = () => {
    try {
      const { subject, body } = formatForEmail(data)
      const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
      window.open(mailtoUrl, "_blank")
      toast.success("Email opened", {
        description: "Your default email client should open with the formatted results.",
      })
    } catch (error) {
      console.error("[v0] Email export failed:", error)
      toast.error("Email export failed", {
        description: "Failed to open email client. Please try again.",
      })
    }
  }

  const handlePDFExport = async () => {
    setIsExporting(true)
    try {
      // Dynamic import to avoid loading jsPDF on initial page load
      const { jsPDF } = await import("jspdf")
      const html2canvas = (await import("html2canvas")).default

      // Create a temporary div with the PDF content
      const tempDiv = document.createElement("div")
      tempDiv.innerHTML = generatePDFContent(data)
      tempDiv.style.position = "absolute"
      tempDiv.style.left = "-9999px"
      tempDiv.style.width = "800px"
      tempDiv.style.backgroundColor = "#ffffff"
      tempDiv.style.color = "#000000"
      // Force all child elements to use standard colors
      tempDiv.style.setProperty("color-scheme", "light")
      document.body.appendChild(tempDiv)

      const allElements = tempDiv.querySelectorAll("*")
      allElements.forEach((el) => {
        const htmlEl = el as HTMLElement
        const computedStyle = window.getComputedStyle(htmlEl)

        // Convert background color if it uses oklch
        const bgColor = computedStyle.backgroundColor
        if (bgColor && bgColor.includes("oklch")) {
          htmlEl.style.backgroundColor = "#ffffff"
        }

        // Convert text color if it uses oklch
        const textColor = computedStyle.color
        if (textColor && textColor.includes("oklch")) {
          htmlEl.style.color = "#000000"
        }

        // Convert border color if it uses oklch
        const borderColor = computedStyle.borderColor
        if (borderColor && borderColor.includes("oklch")) {
          htmlEl.style.borderColor = "#cccccc"
        }
      })

      // Convert to canvas
      const canvas = await html2canvas(tempDiv, {
        width: 800,
        height: tempDiv.scrollHeight,
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
      })

      // Remove temporary div
      document.body.removeChild(tempDiv)

      // Create PDF
      const pdf = new jsPDF("p", "mm", "a4")
      const imgWidth = 210 // A4 width in mm
      const pageHeight = 295 // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight

      let position = 0

      // Add first page
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      // Save the PDF
      const filename = `comparelabs-comparison-${new Date().toISOString().split("T")[0]}.pdf`
      pdf.save(filename)

      toast.success("PDF exported", {
        description: `Your comparison has been saved as ${filename}`,
      })
    } catch (error) {
      console.error("[v0] PDF export failed:", error)
      toast.error("PDF export failed", {
        description: "Failed to generate PDF. Please try again.",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleJSONExport = () => {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `comparelabs-comparison-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success("JSON exported", {
        description: "Raw data has been downloaded as JSON file.",
      })
    } catch (error) {
      console.error("[v0] JSON export failed:", error)
      toast.error("JSON export failed", {
        description: "Failed to export JSON. Please try again.",
      })
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || isExporting}
          className="flex items-center space-x-2 bg-transparent"
        >
          {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          <span>{isExporting ? "Exporting..." : "Export"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleCopyToClipboard} className="flex items-center space-x-2">
          <Copy className="h-4 w-4" />
          <span>Copy to Clipboard</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleEmailExport} className="flex items-center space-x-2">
          <Mail className="h-4 w-4" />
          <span>Send via Email</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handlePDFExport} className="flex items-center space-x-2">
          <FileText className="h-4 w-4" />
          <span>Export as PDF</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleJSONExport} className="flex items-center space-x-2">
          <Download className="h-4 w-4" />
          <span>Export as JSON</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
