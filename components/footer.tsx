import Link from "next/link"

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t bg-background mt-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">CompareLabs.ai</h3>
            <p className="text-sm text-muted-foreground">
              Compare AI models side by side to get the best answers for your questions.
            </p>
          </div>

          {/* Product */}
          <div className="space-y-4">
            <h3 className="font-semibold text-base">Product</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/compare" className="text-muted-foreground hover:text-foreground transition-colors">
                  Compare Models
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h3 className="font-semibold text-base">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                  Privacy & Cookie Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="font-semibold text-base">Contact</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="mailto:support@comparelabs.ai"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  support@comparelabs.ai
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>© {currentYear} CompareLabs Corporation. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
