import { Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './components/landing/landing-page';
import { StreamEditor } from './components/layout/stream-editor';
import { ImpressumPage } from './components/legal/impressum-page';
import { PrivacyPage } from './components/legal/privacy-page';
import { TermsPage } from './components/legal/terms-page';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/stream/:id" element={<StreamEditor />} />
      <Route path="/impressum" element={<ImpressumPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
