/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Login from './components/Login';
import { ErrorBoundary } from './components/ErrorBoundary';
import OnboardingModal from './components/OnboardingModal';
import { auth } from './lib/auth';
import { getE2EEConfig, initE2EE, isE2EEEnabled, unlockE2EE } from './lib/e2ee';
import { ProjectProvider } from './contexts/ProjectContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ToastProvider } from './contexts/ToastContext';
import { Eye, EyeOff, Loader2, Lock } from 'lucide-react';

// Lazy-loaded page components — each splits into its own chunk
const Projects = lazy(() => import('./pages/Projects'));
const ProjectSettings = lazy(() => import('./pages/ProjectSettings'));
const Journal = lazy(() => import('./pages/Journal'));
const Resources = lazy(() => import('./pages/Resources'));
const Explore = lazy(() => import('./pages/Explore'));
const Kanban = lazy(() => import('./pages/Kanban'));
const GlobalKanban = lazy(() => import('./pages/GlobalKanban'));
const Timetable = lazy(() => import('./pages/Timetable'));
const Funding = lazy(() => import('./pages/Funding'));
const Insights = lazy(() => import('./pages/Insights'));
const Composr = lazy(() => import('./pages/Composr'));
const Settings = lazy(() => import('./pages/Settings'));
const Learn = lazy(() => import('./pages/Learn'));
const CourseView = lazy(() => import('./pages/CourseView'));
const LessonView = lazy(() => import('./pages/LessonView'));
const About = lazy(() => import('./pages/About'));
const VimeoDownloader = lazy(() => import('./pages/VimeoDownloader'));

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [e2eeRequired, setE2eeRequired] = useState(false);
  const [e2eeUnlocked, setE2eeUnlocked] = useState(false);
  const [e2eePassphrase, setE2eePassphrase] = useState('');
  const [e2eeError, setE2EEError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Initialize E2EE system
  useEffect(() => {
    const setup = async () => {
      await initE2EE();
      const config = getE2EEConfig();
      if (config.enabled) {
        setE2eeRequired(true);
        if (isE2EEEnabled()) {
          setE2eeUnlocked(true);
        }
      }
    };
    setup();
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const signedIn = await auth.isSignedIn();
      setIsAuthenticated(signedIn);
    };
    checkAuth();
  }, []);

  // Check onboarding status when auth + E2EE are ready
  useEffect(() => {
    if (isAuthenticated && !e2eeRequired) {
      const completed = localStorage.getItem('apexscholar_onboarding_complete');
      if (!completed) {
        // Small delay for smoother UX
        const timer = setTimeout(() => setShowOnboarding(true), 500);
        return () => clearTimeout(timer);
      }
    }
    return undefined;
  }, [isAuthenticated, e2eeRequired]);

  // Handle expired Supabase sessions from any API call
  useEffect(() => {
    const handleSessionExpired = () => {
      setIsAuthenticated(false);
      setSessionExpired(true);
    };
    window.addEventListener('session-expired', handleSessionExpired);
    return () => window.removeEventListener('session-expired', handleSessionExpired);
  }, []);

  const handleUnlock = async () => {
    setE2EEError(null);
    setUnlocking(true);
    try {
      const ok = await unlockE2EE(e2eePassphrase);
      if (!ok) throw new Error('Incorrect passphrase');
      setE2eeUnlocked(true);
      setE2eePassphrase('');

      // Check onboarding after successful unlock
      const completed = localStorage.getItem('apexscholar_onboarding_complete');
      if (!completed) {
        setTimeout(() => setShowOnboarding(true), 500);
      }
    } catch (err: any) {
      setE2EEError(err.message || 'Failed to unlock');
    } finally {
      setUnlocking(false);
    }
  };

  // Loading state while checking auth + E2EE
  if (isAuthenticated === null || (e2eeRequired && !e2eeUnlocked && !isAuthenticated)) {
    return (
      <ThemeProvider>
        <ToastProvider>
          <div className="min-h-[100dvh] bg-[var(--color-bg)] flex items-center justify-center">
            <div className="w-12 h-12 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
          </div>
        </ToastProvider>
      </ThemeProvider>
    );
  }

  if (!isAuthenticated) {
    return (
      <ThemeProvider>
        <ToastProvider>
          {sessionExpired && (
            <div className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-3 bg-amber-500/10 border-b border-amber-500/30 px-4 py-3 text-sm text-amber-300">
              <span>⚠️</span>
              <span>Your session has expired. Please sign in again to continue.</span>
              <button
                onClick={() => setSessionExpired(false)}
                className="ml-auto text-amber-400 hover:text-amber-200 transition-colors"
              >
                ✕
              </button>
            </div>
          )}
          <Login
            onLoginSuccess={() => {
              setIsAuthenticated(true);
              setSessionExpired(false);
            }}
          />
        </ToastProvider>
      </ThemeProvider>
    );
  }

  // E2EE Unlock Screen (appears over the app)
  if (e2eeRequired && !e2eeUnlocked) {
    return (
      <ThemeProvider>
        <ToastProvider>
          <div className="min-h-[100dvh] bg-[var(--color-bg)] flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-[var(--color-surface)] border border-indigo-500/20 rounded-xl p-8">
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-14 h-14 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4">
                  <Lock className="w-7 h-7 text-indigo-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Vault Locked</h2>
                <p className="text-sm text-zinc-400">
                  Enter your encryption passphrase to access your research data.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Passphrase</label>
                  <div className="relative">
                    <input
                      type={showPassphrase ? 'text' : 'password'}
                      value={e2eePassphrase}
                      onChange={(e) => setE2eePassphrase(e.target.value)}
                      placeholder="Your encryption passphrase"
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassphrase(!showPassphrase)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      {showPassphrase ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {e2eeError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-sm text-rose-300">
                    {e2eeError}
                  </div>
                )}

                <button
                  onClick={handleUnlock}
                  disabled={unlocking}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  {unlocking ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Lock className="w-5 h-5" />
                  )}
                  {unlocking ? 'Unlocking...' : 'Unlock Vault'}
                </button>

                <p className="text-xs text-zinc-500 text-center">
                  Forgot your passphrase? You will need to restore from an unencrypted backup.
                </p>
              </div>
            </div>
          </div>
        </ToastProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <ToastProvider>
        <OnboardingModal />
        <NotificationProvider>
          <ProjectProvider>
            <Router>
              <Layout>
                <ErrorBoundary>
                  <Suspense
                    fallback={
                      <div className="flex items-center justify-center min-h-[60vh]">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-10 h-10 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
                          <span className="text-sm text-zinc-500">Loading module…</span>
                        </div>
                      </div>
                    }
                  >
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/projects" element={<Projects />} />
                      <Route path="/projects/settings" element={<ProjectSettings />} />
                      <Route path="/journal" element={<Journal />} />
                      <Route path="/resources" element={<Resources />} />
                      <Route path="/explore" element={<Explore />} />
                      <Route path="/kanban" element={<Kanban />} />
                      <Route path="/backlog" element={<GlobalKanban />} />
                      <Route path="/timetable" element={<Timetable />} />
                      <Route path="/funding" element={<Funding />} />
                      <Route path="/insights" element={<Insights />} />
                      <Route path="/composr" element={<Composr />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/learn" element={<Learn />} />
                      <Route path="/learn/:courseId" element={<CourseView />} />
                      <Route path="/learn/:courseId/:lessonId" element={<LessonView />} />
                      <Route path="/about" element={<About />} />
                      <Route path="/vimeo-downloader" element={<VimeoDownloader />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Suspense>
                </ErrorBoundary>
              </Layout>
            </Router>
          </ProjectProvider>
        </NotificationProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
