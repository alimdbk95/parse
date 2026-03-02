'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfService() {
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

        <h1 className="text-3xl font-bold text-foreground mb-2">Terms of Service</h1>
        <p className="text-foreground-tertiary mb-8">Last updated: March 2, 2026</p>

        <div className="prose prose-invert max-w-none space-y-6 text-foreground-secondary">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Parse ("the Service"), you agree to be bound by these Terms of Service.
              If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. Description of Service</h2>
            <p>
              Parse is an AI-powered document analysis platform that helps users extract insights,
              visualize data, and generate reports from uploaded documents. The Service includes
              document processing, AI-assisted analysis, chart generation, and collaboration features.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. User Accounts</h2>
            <p>To use the Service, you must:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized access</li>
              <li>Be at least 18 years old or have parental consent</li>
            </ul>
            <p className="mt-2">
              You are responsible for all activities that occur under your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Upload malicious files, malware, or harmful content</li>
              <li>Use the Service for illegal purposes</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt the Service</li>
              <li>Reverse engineer or copy the Service</li>
              <li>Use automated systems to access the Service without permission</li>
              <li>Upload content that infringes on intellectual property rights</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Your Content</h2>
            <p>
              You retain ownership of all documents and content you upload to Parse. By uploading content,
              you grant us a limited license to process, analyze, and store your content solely for the
              purpose of providing the Service to you.
            </p>
            <p className="mt-2">
              You are responsible for ensuring you have the right to upload and process any content
              you submit to the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. AI-Generated Content</h2>
            <p>
              The Service uses artificial intelligence to analyze documents and generate insights.
              While we strive for accuracy, AI-generated content may contain errors or inaccuracies.
              You should verify important information independently and not rely solely on AI outputs
              for critical decisions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Intellectual Property</h2>
            <p>
              The Service, including its design, features, and technology, is owned by Parse and
              protected by intellectual property laws. You may not copy, modify, or distribute any
              part of the Service without our written permission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">8. Service Availability</h2>
            <p>
              We strive to maintain high availability but do not guarantee uninterrupted access.
              The Service may be temporarily unavailable due to maintenance, updates, or technical issues.
              We reserve the right to modify or discontinue features with reasonable notice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">9. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Parse shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages, including loss of profits,
              data, or business opportunities, arising from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">10. Disclaimer of Warranties</h2>
            <p>
              The Service is provided "as is" without warranties of any kind, either express or implied,
              including but not limited to warranties of merchantability, fitness for a particular purpose,
              or non-infringement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">11. Termination</h2>
            <p>
              We may suspend or terminate your account if you violate these terms or engage in harmful
              conduct. You may delete your account at any time through the settings page. Upon termination,
              your right to use the Service will cease, and we may delete your data after a reasonable
              retention period.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">12. Changes to Terms</h2>
            <p>
              We may update these terms from time to time. We will notify you of significant changes
              via email or through the Service. Continued use of the Service after changes constitutes
              acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">13. Governing Law</h2>
            <p>
              These terms shall be governed by and construed in accordance with applicable laws,
              without regard to conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">14. Contact</h2>
            <p>
              If you have questions about these Terms of Service, please contact us at{' '}
              <a href="mailto:legal@parse.app" className="text-primary hover:underline">
                legal@parse.app
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <Link href="/privacy" className="text-primary hover:underline">
            View Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
