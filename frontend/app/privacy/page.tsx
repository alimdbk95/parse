'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-foreground-secondary hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-foreground-tertiary mb-8">Last updated: March 2, 2026</p>

        <div className="prose prose-invert max-w-none space-y-6 text-foreground-secondary">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Introduction</h2>
            <p>
              Parse ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy
              explains how we collect, use, disclose, and safeguard your information when you use our
              document analysis platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. Information We Collect</h2>

            <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Information You Provide</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Account Information:</strong> Name, email address, and password when you register</li>
              <li><strong>Documents:</strong> Files you upload for analysis</li>
              <li><strong>Analysis Data:</strong> Chat conversations, saved charts, and reports you create</li>
              <li><strong>Workspace Data:</strong> Team information and collaboration settings</li>
              <li><strong>Branding Preferences:</strong> Custom colors, logos, and fonts you configure</li>
            </ul>

            <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Information Collected Automatically</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Usage Data:</strong> Features used, pages visited, and interaction patterns</li>
              <li><strong>Device Information:</strong> Browser type, operating system, and device identifiers</li>
              <li><strong>Log Data:</strong> IP address, access times, and error logs</li>
              <li><strong>Cookies:</strong> Session tokens and preference settings</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Provide and improve the Service</li>
              <li>Process and analyze your documents using AI</li>
              <li>Generate charts, insights, and reports</li>
              <li>Authenticate and secure your account</li>
              <li>Send service-related notifications</li>
              <li>Respond to your inquiries and support requests</li>
              <li>Monitor and analyze usage patterns to improve features</li>
              <li>Detect and prevent fraud or abuse</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. AI Processing</h2>
            <p>
              Your documents are processed by AI systems (including third-party AI providers like Anthropic)
              to provide analysis features. Document content is sent to these services for processing but
              is not used to train AI models. We select AI providers with strong privacy practices and
              data protection commitments.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Data Storage and Security</h2>
            <p>We implement industry-standard security measures including:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Encryption of data in transit (TLS/SSL) and at rest</li>
              <li>Secure password hashing (bcrypt)</li>
              <li>Access controls and authentication</li>
              <li>Regular security assessments</li>
              <li>Secure cloud infrastructure (AWS, Railway, Vercel)</li>
            </ul>
            <p className="mt-2">
              Your documents are stored securely and are only accessible by you and users you
              explicitly share them with through workspaces.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. Data Sharing</h2>
            <p>We do not sell your personal information. We may share data with:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Service Providers:</strong> Cloud hosting, AI processing, email delivery, and error monitoring services that help us operate</li>
              <li><strong>Workspace Members:</strong> Users you invite to collaborate in your workspaces</li>
              <li><strong>Legal Requirements:</strong> When required by law, court order, or government request</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active or as needed to provide services.
              When you delete your account, we will delete your personal data within 30 days, except where
              retention is required by law or for legitimate business purposes (such as resolving disputes
              or enforcing agreements).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">8. Your Rights</h2>
            <p>Depending on your location, you may have the right to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Update or correct inaccurate data</li>
              <li><strong>Deletion:</strong> Request deletion of your data</li>
              <li><strong>Export:</strong> Download your data in a portable format</li>
              <li><strong>Restriction:</strong> Limit how we process your data</li>
              <li><strong>Objection:</strong> Object to certain processing activities</li>
            </ul>
            <p className="mt-2">
              To exercise these rights, contact us at{' '}
              <a href="mailto:privacy@parse.app" className="text-primary hover:underline">
                privacy@parse.app
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">9. Cookies</h2>
            <p>
              We use essential cookies to maintain your session and preferences. We do not use
              third-party tracking cookies for advertising. You can control cookie settings through
              your browser, but disabling essential cookies may affect Service functionality.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">10. Children's Privacy</h2>
            <p>
              The Service is not intended for users under 18 years of age. We do not knowingly collect
              personal information from children. If you believe we have collected data from a child,
              please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">11. International Transfers</h2>
            <p>
              Your data may be processed in countries other than your own. We ensure appropriate
              safeguards are in place for international data transfers in compliance with applicable
              data protection laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">12. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy periodically. We will notify you of significant changes
              via email or through the Service. The "Last updated" date at the top indicates when the
              policy was last revised.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">13. Contact Us</h2>
            <p>
              If you have questions or concerns about this Privacy Policy or our data practices,
              please contact us at:
            </p>
            <ul className="list-none mt-2 space-y-1">
              <li>
                Email:{' '}
                <a href="mailto:privacy@parse.app" className="text-primary hover:underline">
                  privacy@parse.app
                </a>
              </li>
            </ul>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <Link href="/terms" className="text-primary hover:underline">
            View Terms of Service
          </Link>
        </div>
      </div>
    </div>
  );
}
