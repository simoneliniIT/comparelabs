import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 max-w-4xl">
        <h1 className="text-3xl sm:text-4xl font-bold mb-8">Terms and Conditions</h1>
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-sm sm:text-base">
          <p className="text-muted-foreground">Last updated: January 2025</p>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8">1. Agreement to Terms</h2>
            <p>
              By accessing or using CompareLabs.ai (the "Service"), you agree to be bound by these Terms and Conditions
              ("Terms"). If you disagree with any part of these terms, you may not access the Service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8">2. Description of Service</h2>
            <p>
              CompareLabs.ai is operated by CompareLabs Corporation ("Company", "we", "us", or "our"). The Service
              provides a platform for comparing responses from multiple AI language models simultaneously.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8">3. User Accounts</h2>
            <p>
              When you create an account with us, you must provide accurate, complete, and current information. Failure
              to do so constitutes a breach of the Terms, which may result in immediate termination of your account.
            </p>
            <p>
              You are responsible for safeguarding the password and for all activities that occur under your account.
              You agree to notify us immediately of any unauthorized use of your account.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8">4. Subscription Plans and Credits</h2>
            <p>CompareLabs.ai offers various subscription plans with different credit allocations:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Free Plan: 500 credits per month</li>
              <li>Plus Plan: 10,000 credits per month ($9.99/month)</li>
              <li>Pro Plan: 30,000 credits per month ($29.99/month)</li>
            </ul>
            <p>
              Credits are consumed based on the AI models you query. Credits reset monthly and do not roll over to the
              next billing period.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8">5. Payment and Billing</h2>
            <p>
              Paid subscriptions are billed on a recurring monthly basis. You authorize us to charge your payment method
              for the subscription fee at the beginning of each billing cycle.
            </p>
            <p>
              You may cancel your subscription at any time. Cancellation will take effect at the end of the current
              billing period. No refunds will be provided for partial months.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8">6. Acceptable Use</h2>
            <p>You agree not to use the Service to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe upon the rights of others</li>
              <li>Generate harmful, abusive, or illegal content</li>
              <li>Attempt to gain unauthorized access to the Service or related systems</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Use automated systems to access the Service without permission</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8">7. Intellectual Property</h2>
            <p>
              The Service and its original content, features, and functionality are owned by CompareLabs Corporation and
              are protected by international copyright, trademark, and other intellectual property laws.
            </p>
            <p>
              You retain ownership of any content you submit to the Service. By submitting content, you grant us a
              worldwide, non-exclusive, royalty-free license to use, reproduce, and process your content solely for the
              purpose of providing the Service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8">8. Third-Party AI Models</h2>
            <p>
              The Service integrates with third-party AI models (including but not limited to OpenAI, Anthropic, Google,
              and Meta). Your use of these models through our Service is subject to their respective terms of service
              and privacy policies.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8">9. Disclaimer of Warranties</h2>
            <p>
              The Service is provided "AS IS" and "AS AVAILABLE" without warranties of any kind, either express or
              implied. We do not warrant that the Service will be uninterrupted, secure, or error-free.
            </p>
            <p>
              AI-generated responses may contain inaccuracies or errors. You are responsible for verifying the accuracy
              of any information obtained through the Service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8">10. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, CompareLabs Corporation shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages resulting from your use of or inability to use the
              Service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8">11. Data Protection and Privacy</h2>
            <p>
              Your use of the Service is also governed by our Privacy Policy. We are committed to protecting your
              personal data in accordance with GDPR and other applicable data protection laws.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8">12. Termination</h2>
            <p>
              We may terminate or suspend your account immediately, without prior notice, for any reason, including
              breach of these Terms. Upon termination, your right to use the Service will immediately cease.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8">13. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. We will notify you of any changes by posting the
              new Terms on this page and updating the "Last updated" date.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8">14. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which
              CompareLabs Corporation is registered, without regard to its conflict of law provisions.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8">15. Contact Us</h2>
            <p>If you have any questions about these Terms, please contact us at:</p>
            <p>
              Email:{" "}
              <a href="mailto:legal@comparelabs.ai" className="text-primary hover:underline">
                legal@comparelabs.ai
              </a>
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
