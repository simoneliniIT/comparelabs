import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 max-w-4xl">
        <h1 className="text-3xl sm:text-4xl font-bold mb-8">Privacy & Cookie Policy</h1>
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-sm sm:text-base">
          <p className="text-muted-foreground">Last updated: January 2025</p>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8">1. Introduction</h2>
            <p>
              CompareLabs Corporation ("we", "us", or "our") operates CompareLabs.ai. This Privacy Policy explains how
              we collect, use, disclose, and safeguard your information when you use our Service.
            </p>
            <p>
              We are committed to protecting your privacy and complying with the General Data Protection Regulation
              (GDPR) and other applicable data protection laws.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8">2. Information We Collect</h2>
            <h3 className="text-xl font-semibold mt-6">2.1 Personal Information</h3>
            <p>We collect the following personal information when you create an account:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Email address</li>
              <li>Full name</li>
              <li>Payment information (processed securely through Stripe)</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">
              <strong>Note on Authentication:</strong> Your password is managed securely by Supabase, our authentication
              provider. We never store, access, or have visibility into your password. Supabase uses industry-standard
              encryption and security practices to protect your credentials.
            </p>

            <h3 className="text-xl font-semibold mt-6">2.2 Usage Data</h3>
            <p>We automatically collect certain information when you use the Service:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Queries submitted to AI models</li>
              <li>AI model responses</li>
              <li>Usage statistics (credits consumed, models used)</li>
              <li>Device information and IP address</li>
              <li>Browser type and version</li>
              <li>Pages visited and time spent on pages</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8">3. Cookies and Tracking Technologies</h2>

            <h3 className="text-xl font-semibold mt-6">3.1 What Are Cookies</h3>
            <p>
              Cookies are small text files that are placed on your device when you visit our website. They help us
              provide you with a better experience by remembering your preferences and understanding how you use our
              Service.
            </p>

            <h3 className="text-xl font-semibold mt-6">3.2 Types of Cookies We Use</h3>

            <h4 className="text-lg font-semibold mt-4">Strictly Necessary Cookies</h4>
            <p>These cookies are essential for the Service to function and cannot be disabled. They include:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Authentication cookies (to keep you logged in)</li>
              <li>Security cookies (to protect against fraud)</li>
              <li>Session cookies (to maintain your session)</li>
            </ul>

            <h4 className="text-lg font-semibold mt-4">Analytics Cookies</h4>
            <p>
              We use Google Analytics to understand how visitors interact with our Service. These cookies collect
              information such as pages visited, time spent on pages, browser and device information, and geographic
              location.
            </p>

            <h4 className="text-lg font-semibold mt-4">Preference Cookies</h4>
            <p>
              These cookies remember your choices and preferences, such as language preferences, theme preferences, and
              cookie consent preferences.
            </p>

            <h3 className="text-xl font-semibold mt-6">3.3 Third-Party Cookies</h3>
            <p>We use the following third-party services that may set cookies:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Google Analytics:</strong> For website analytics
              </li>
              <li>
                <strong>Stripe:</strong> For payment processing
              </li>
            </ul>

            <h3 className="text-xl font-semibold mt-6">3.4 Managing Cookies</h3>
            <p>
              You can control and manage cookies through your browser settings. Most browsers allow you to refuse or
              delete cookies. Please note that disabling certain cookies may affect the functionality of the Service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8">4. How We Use Your Information</h2>
            <p>We use your information for the following purposes:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>To provide and maintain the Service</li>
              <li>To process your transactions and manage your subscription</li>
              <li>To send you service-related communications</li>
              <li>To improve and optimize the Service</li>
              <li>To detect and prevent fraud or abuse</li>
              <li>To comply with legal obligations</li>
              <li>To analyze usage patterns and trends</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8">5. Legal Basis for Processing (GDPR)</h2>
            <p>Under GDPR, we process your personal data based on the following legal grounds:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Contract Performance:</strong> Processing necessary to provide the Service you requested
              </li>
              <li>
                <strong>Legitimate Interests:</strong> Improving our Service and preventing fraud
              </li>
              <li>
                <strong>Legal Obligation:</strong> Complying with applicable laws and regulations
              </li>
              <li>
                <strong>Consent:</strong> Where you have given explicit consent for specific processing activities
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8">6. Data Sharing and Disclosure</h2>
            <p>We may share your information with:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Third-Party AI Providers:</strong> Your queries are sent to AI model providers (OpenAI,
                Anthropic, Google, Meta) to generate responses
              </li>
              <li>
                <strong>Payment Processors:</strong> Stripe processes payment information securely
              </li>
              <li>
                <strong>Service Providers:</strong> Companies that help us operate the Service (hosting, analytics)
              </li>
              <li>
                <strong>Legal Requirements:</strong> When required by law or to protect our rights
              </li>
            </ul>
            <p>We do not sell your personal information to third parties.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8">7. Your Rights Under GDPR</h2>
            <p>If you are in the European Economic Area (EEA), you have the following rights:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Right to Access:</strong> Request a copy of your personal data
              </li>
              <li>
                <strong>Right to Rectification:</strong> Correct inaccurate or incomplete data
              </li>
              <li>
                <strong>Right to Erasure:</strong> Request deletion of your personal data
              </li>
              <li>
                <strong>Right to Restrict Processing:</strong> Limit how we use your data
              </li>
              <li>
                <strong>Right to Data Portability:</strong> Receive your data in a structured format
              </li>
              <li>
                <strong>Right to Object:</strong> Object to processing based on legitimate interests
              </li>
              <li>
                <strong>Right to Withdraw Consent:</strong> Withdraw consent at any time
              </li>
            </ul>
            <p>
              To exercise these rights, contact us at{" "}
              <a href="mailto:privacy@comparelabs.ai" className="text-primary hover:underline">
                privacy@comparelabs.ai
              </a>
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8">8. Data Retention</h2>
            <p>
              We retain your personal data for as long as necessary to provide the Service and comply with legal
              obligations. When you delete your account, we will delete or anonymize your personal data within 30 days,
              except where we are required to retain it by law.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8">9. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal data against
              unauthorized access, alteration, disclosure, or destruction. These measures include:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Encryption of data in transit and at rest</li>
              <li>Regular security assessments</li>
              <li>Access controls and authentication</li>
              <li>Secure authentication managed by Supabase (passwords are never stored in our database)</li>
              <li>Secure data storage with Supabase</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8">10. International Data Transfers</h2>
            <p>
              Your data may be transferred to and processed in countries outside the EEA. We ensure appropriate
              safeguards are in place, such as Standard Contractual Clauses, to protect your data in accordance with
              GDPR requirements.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8">11. Children's Privacy</h2>
            <p>
              Our Service is not intended for children under 16 years of age. We do not knowingly collect personal data
              from children under 16. If you believe we have collected data from a child, please contact us immediately.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8">12. Changes to This Policy</h2>
            <p>
              We may update this Privacy & Cookie Policy from time to time. We will notify you of any changes by posting
              the new policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8">13. Contact Us</h2>
            <p>If you have questions about this policy or wish to exercise your rights, contact us at:</p>
            <p>
              Email:{" "}
              <a href="mailto:privacy@comparelabs.ai" className="text-primary hover:underline">
                privacy@comparelabs.ai
              </a>
            </p>
            <p>
              Data Protection Officer:{" "}
              <a href="mailto:dpo@comparelabs.ai" className="text-primary hover:underline">
                dpo@comparelabs.ai
              </a>
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8">14. Supervisory Authority</h2>
            <p>
              If you are in the EEA and believe we have not addressed your concerns, you have the right to lodge a
              complaint with your local data protection supervisory authority.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
