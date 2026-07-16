import { Link } from 'react-router-dom';
import { Footer } from '../layout/footer';
import { ThemeToggle } from '../ui/theme-toggle';

export function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
              <div className="w-8 h-8 rounded-md bg-primary-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="font-semibold">Value Modeller</span>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        <nav className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          <Link to="/" className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors">Home</Link>
          <span className="mx-2">›</span>
          <span className="text-gray-900 dark:text-gray-100">Terms of Use</span>
        </nav>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Terms of Use</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Nutzungsbedingungen</p>

        {/* PLACEHOLDER NOTICE */}
        <div className="mb-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-300 font-medium">
            ⚠ Placeholder content — replace with legally verified terms before going live.
          </p>
        </div>

        <div className="space-y-8 text-gray-700 dark:text-gray-300">

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">1. Scope and Acceptance</h2>
            <p className="text-sm leading-relaxed">
              {/* PLACEHOLDER: Replace with company name */}
              These Terms of Use govern your access to and use of Value Modeller, provided by
              [Company Name Placeholder] ("we", "us", or "our"). By using this application, you agree to these terms.
              If you do not agree, please discontinue use.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">2. Description of the Service</h2>
            <p className="text-sm leading-relaxed">
              Value Modeller is a browser-based tool that allows users to create, visualise, and manage SIPOC process
              chains for value stream modelling. All data is stored locally in the user's browser and is not transmitted
              to any server.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">3. Permitted Use</h2>
            <p className="text-sm leading-relaxed mb-2">You may use Value Modeller for:</p>
            <ul className="space-y-1 text-sm list-disc list-inside">
              <li>Internal business process modelling and documentation</li>
              <li>Educational and demonstration purposes</li>
              <li>Personal productivity and workflow design</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">4. Prohibited Use</h2>
            <p className="text-sm leading-relaxed mb-2">You may not:</p>
            <ul className="space-y-1 text-sm list-disc list-inside">
              <li>Use the application for any unlawful purpose</li>
              <li>Attempt to reverse-engineer, decompile, or otherwise extract source code</li>
              <li>Distribute, resell, or sublicense the application without written consent</li>
              <li>Use the application in a way that could damage, disable, or impair its functionality</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">5. Intellectual Property</h2>
            <p className="text-sm leading-relaxed">
              {/* PLACEHOLDER: Confirm IP ownership */}
              All intellectual property rights in the application, including its design, code, and documentation,
              are owned by [Company Name Placeholder] or its licensors. Your use of the application does not
              grant you any ownership rights.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">6. Data and Content</h2>
            <p className="text-sm leading-relaxed">
              Any content you create within Value Modeller (value streams, process data) belongs to you. Since all data
              is stored locally in your browser, we have no access to it. You are responsible for backing up your data.
              We are not liable for any data loss resulting from browser data clearing or device failure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">7. Disclaimer of Warranties</h2>
            <p className="text-sm leading-relaxed">
              The application is provided "as is" and "as available" without warranties of any kind, either express or
              implied. We do not warrant that the application will be error-free, uninterrupted, or suitable for any
              particular purpose.
              {/* PLACEHOLDER: Review with legal counsel before publishing */}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">8. Limitation of Liability</h2>
            <p className="text-sm leading-relaxed">
              {/* PLACEHOLDER: Review limitation of liability clauses with legal counsel */}
              To the fullest extent permitted by applicable law, [Company Name Placeholder] shall not be liable for
              any indirect, incidental, special, consequential, or punitive damages arising out of or relating to your
              use of the application.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">9. Governing Law</h2>
            <p className="text-sm leading-relaxed">
              {/* PLACEHOLDER: Confirm governing law jurisdiction */}
              These Terms of Use are governed by and construed in accordance with the laws of Germany,
              without regard to conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">10. Changes to These Terms</h2>
            {/* PLACEHOLDER: Update last-modified date whenever terms change */}
            <p className="text-sm leading-relaxed">
              We reserve the right to update these Terms of Use at any time. Continued use of the application after
              changes constitutes acceptance of the revised terms.
              Last modified: <time dateTime="2026-07-15">[Date Placeholder]</time>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">11. Contact</h2>
            {/* PLACEHOLDER: Replace with actual contact email */}
            <p className="text-sm leading-relaxed">
              For questions about these Terms of Use, please contact:<br />
              <a href="mailto:legal@placeholder.example" className="text-primary-600 dark:text-primary-400 hover:underline">legal@placeholder.example</a>
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
