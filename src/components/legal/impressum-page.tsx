import { Link } from 'react-router-dom';
import { Footer } from '../layout/footer';
import { ThemeToggle } from '../ui/theme-toggle';

export function ImpressumPage() {
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
          <span className="text-gray-900 dark:text-gray-100">Impressum</span>
        </nav>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">Impressum</h1>

        {/* PLACEHOLDER NOTICE */}
        <div className="mb-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-300 font-medium">
            ⚠ Placeholder content — replace with legally verified information before going live.
          </p>
        </div>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8 text-gray-700 dark:text-gray-300">

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Angaben gemäß § 5 TMG</h2>
            {/* PLACEHOLDER: Replace with the legal entity responsible for this service */}
            <address className="not-italic text-sm leading-relaxed">
              <strong>[Company Name Placeholder]</strong><br />
              [Street and House Number]<br />
              [Postal Code] [City]<br />
              Deutschland
            </address>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Vertreten durch</h2>
            {/* PLACEHOLDER: Name(s) of managing director(s) */}
            <p className="text-sm">[Managing Director Name(s)]</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Kontakt</h2>
            <p className="text-sm leading-relaxed">
              {/* PLACEHOLDER: Replace with actual contact details */}
              Telefon: [+49 XXX XXXXXXX]<br />
              E-Mail: <a href="mailto:info@placeholder.example" className="text-primary-600 dark:text-primary-400 hover:underline">info@placeholder.example</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Registereintrag</h2>
            <p className="text-sm leading-relaxed">
              {/* PLACEHOLDER: Replace with actual register court and number */}
              Eintragung im Handelsregister.<br />
              Registergericht: [Registergericht]<br />
              Registernummer: [HRB XXXXX]
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Umsatzsteuer-ID</h2>
            <p className="text-sm leading-relaxed">
              {/* PLACEHOLDER: Replace with actual VAT ID */}
              Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz:<br />
              DE [XXXXXXXXX]
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
            {/* PLACEHOLDER: Name and address of person responsible for content */}
            <address className="not-italic text-sm leading-relaxed">
              [Name]<br />
              [Street and House Number]<br />
              [Postal Code] [City]
            </address>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Haftungsausschluss</h2>
            <h3 className="text-base font-medium text-gray-800 dark:text-gray-200 mb-2">Haftung für Inhalte</h3>
            <p className="text-sm leading-relaxed mb-4">
              Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen
              Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet,
              übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf
              eine rechtswidrige Tätigkeit hinweisen.
            </p>

            <h3 className="text-base font-medium text-gray-800 dark:text-gray-200 mb-2">Haftung für Links</h3>
            <p className="text-sm leading-relaxed">
              Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben.
              Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten
              Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
