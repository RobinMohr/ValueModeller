import { Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './components/landing/landing-page';
import { StreamEditor } from './components/layout/stream-editor';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/stream/:id" element={<StreamEditor />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
