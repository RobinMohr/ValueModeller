import { Link } from 'react-router-dom';
import { Footer } from '../layout/footer';
import { ThemeToggle } from '../ui/theme-toggle';

export function PrivacyPage() {
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
          <span className="text-gray-900 dark:text-gray-100">Privacy Policy</span>
        </nav>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Datenschutzerklärung</p>

        {/* PLACEHOLDER NOTICE */}
        <div className="mb-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-300 font-medium">
            ⚠ Placeholder content — replace with legally verified information (GDPR / DSGVO compliant) before going live.
          </p>
        </div>

        <div className="space-y-8 text-gray-700 dark:text-gray-300">

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">1. Data Controller</h2>
            {/* PLACEHOLDER: Replace with the actual data controller */}
            <p className="text-sm leading-relaxed">
              The responsible party (controller) within the meaning of data protection law is:<br /><br />
              <strong>[Company Name Placeholder]</strong><br />
              [Street and House Number]<br />
              [Postal Code] [City], Germany<br />
              E-Mail: <a href="mailto:privacy@placeholder.example" className="text-primary-600 dark:text-primary-400 hover:underline">privacy@placeholder.example</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">2. Data We Collect</h2>
            <p className="text-sm leading-relaxed mb-3">
              Value Modeller is a client-side application. All data you enter (value streams, SIPOC process data) is stored
              exclusively in your browser's <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-xs">localStorage</code>.
              <strong> No personal data is transmitted to any server.</strong>
            </p>
            <p className="text-sm leading-relaxed">
              {/* PLACEHOLDER: Expand if server-side analytics or error tracking is added in the future */}
              We do not use cookies for tracking or analytics. We do not share your data with third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">3. localStorage Data</h2>
            <p className="text-sm leading-relaxed">
              The application stores the following data locally in your browser:
            </p>
            <ul className="mt-2 space-y-1 text-sm list-disc list-inside">
              <li>Value stream names, descriptions, and metadata you enter</li>
              <li>SIPOC process node data (Supplier, Input, Process, Output, Customer)</li>
              <li>UI preferences (theme / dark mode setting)</li>
            </ul>
            <p className="mt-3 text-sm leading-relaxed">
              You can clear this data at any time via your browser settings (clear site data) or using the
              application's built-in "Clear data &amp; reload" recovery function.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">4. Your Rights (GDPR)</h2>
            <p className="text-sm leading-relaxed mb-2">
              Under the General Data Protection Regulation (GDPR / DSGVO), you have the following rights:
            </p>
            <ul className="mt-2 space-y-1 text-sm list-disc list-inside">
              <li>Right of access (Art. 15 GDPR)</li>
              <li>Right to rectification (Art. 16 GDPR)</li>
              <li>Right to erasure ("right to be forgotten") (Art. 17 GDPR)</li>
              <li>Right to restriction of processing (Art. 18 GDPR)</li>
              <li>Right to data portability (Art. 20 GDPR)</li>
              <li>Right to object (Art. 21 GDPR)</li>
            </ul>
            {/* PLACEHOLDER: Replace with actual contact for privacy requests */}
            <p className="mt-3 text-sm leading-relaxed">
              To exercise your rights, please contact: <a href="mailto:privacy@placeholder.example" className="text-primary-600 dark:text-primary-400 hover:underline">privacy@placeholder.example</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">5. Data Security</h2>
            <p className="text-sm leading-relaxed">
              We use appropriate technical measures to protect data within the application. As all data resides in your
              browser, security also depends on your device and browser configuration. We recommend keeping your browser
              up to date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">6. Changes to This Policy</h2>
            {/* PLACEHOLDER: Update last-modified date whenever the policy changes */}
            <p className="text-sm leading-relaxed">
              We may update this privacy policy to reflect changes in the application or legal requirements.
              Last modified: <time dateTime="2026-07-15">[Date Placeholder]</time>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">7. Supervisory Authority</h2>
            <p className="text-sm leading-relaxed">
              {/* PLACEHOLDER: Replace with the relevant supervisory authority for your jurisdiction */}
              You have the right to lodge a complaint with the competent data protection supervisory authority.
              In Germany the relevant authority depends on the registered state of the company.
              [Supervisory Authority Name and Contact Placeholder]
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
