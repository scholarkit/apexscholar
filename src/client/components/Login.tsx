import { useState } from 'react';
import { Eye, EyeOff, Globe, Rocket, Shield } from 'lucide-react';
import { auth } from '../lib/auth';

interface LoginProps {
  onLoginSuccess: () => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSignIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      let user;
      if (isSignUp) {
        if (!username.trim()) throw new Error('Username is required for signup');
        user = await auth.signUp(email, password, username.trim());
      } else {
        user = await auth.signInWithPassword(email, password);
      }
      if (user) {
        onLoginSuccess();
      } else {
        setError('Sign in failed.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-[var(--color-bg)] text-[var(--color-text)] selection:bg-indigo-500/30 p-4 relative overflow-hidden subtle-mesh">
      {/* Ambient background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-500/10 blur-[130px] rounded-full" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-500/10 blur-[130px] rounded-full" />
      </div>

      <div className="relative w-full sm:max-w-lg">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 bg-indigo-500/10 border border-indigo-500/20 shadow-lg shadow-indigo-500/10">
            <img src="/logo-transparent.png" alt="logo" className="w-10 h-10" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--color-text)] tracking-tight mb-2">
            Apex Scholar
          </h1>
          <p className="text-[var(--color-text-muted)] text-sm sm:text-base">
            Private, portable workspace for academic literature and writing.
          </p>
        </div>

        {/* Auth Card */}
        <div className="card-elevated rounded-3xl p-6 sm:p-8 relative backdrop-blur-2xl">
          <div className="space-y-6">
            {error && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs sm:text-sm text-center font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSignIn} className="space-y-4">
              {isSignUp && (
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1.5 uppercase tracking-wider">
                    Username
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MarieCurie"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm"
                    required={isSignUp}
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1.5 uppercase tracking-wider">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="scholar@institution.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1.5 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl pl-4 pr-12 py-3 text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors focus:outline-none rounded-lg"
                    title={showPassword ? 'Hide password' : 'Show password'}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 bg-indigo-600 hover:bg-indigo-500 cursor-pointer text-white rounded-xl font-bold text-base transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 shadow-md shadow-indigo-600/25 mt-2"
              >
                <div className="flex items-center justify-center gap-2.5">
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{isSignUp ? 'Create Workspace' : 'Sign In to Workspace'}</span>
                      <Shield className="w-4 h-4" />
                    </>
                  )}
                </div>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer transition-colors font-medium"
                >
                  {isSignUp ? 'Already have an account? Sign in' : "First time here? Create your account"}
                </button>
              </div>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[var(--color-border)]">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-surface-2)]/50 border border-[var(--color-border)]">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-[var(--color-text)]">Local-First</h4>
                  <p className="text-[11px] text-[var(--color-text-muted)]">Encrypted browser data</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-surface-2)]/50 border border-[var(--color-border)]">
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-[var(--color-text)]">Private Vault</h4>
                  <p className="text-[11px] text-[var(--color-text-muted)]">Zero telemetry tracking</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
