import { useState } from 'react';
import { Shield, Rocket, Globe } from 'lucide-react';
import { puterService } from '../lib/puter';
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

    const provider = import.meta.env.VITE_PROVIDER || 'puter';

    const handleSignIn = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            if (provider === 'supabase') {
                let user;
                if (isSignUp) {
                    if (!username.trim()) throw new Error('Username is required for signup');
                    user = await auth.signUp!(email, password, username.trim());
                } else {
                    user = await auth.signInWithPassword!(email, password);
                }
                if (user) {
                    onLoginSuccess();
                } else {
                    setError('Sign in failed.');
                }
            } else {
                const user = await puterService.signIn();
                if (user) {
                    onLoginSuccess();
                } else {
                    setError('Sign in cancelled or failed.');
                }
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred during authentication.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] flex items-center justify-center bg-[#09090b] selection:bg-indigo-500/30">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[25%] -left-[25%] w-[50%] h-[50%] bg-indigo-500/10 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute -bottom-[25%] -right-[25%] w-[50%] h-[50%] bg-purple-500/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            <div className="relative w-full sm:max-w-2xl">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-xl mb-6 shadow-2xl shadow-indigo-500/10">
                        <img src="/logo-transparent.png" alt="logo" className="w-16 h-16" />
                    </div>
                    <h1 className="text-4xl font-bold text-white tracking-tight mb-3">
                        Apex Scholar
                    </h1>
                    <p className="text-zinc-400 text-lg">
                        Secure, portable research management.
                    </p>
                </div>

                <div className="bg-zinc-900/50 border border-neutral-800 backdrop-blur-xl rounded-xl p-8 overflow-hidden relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <div className="relative space-y-6">
                        <div className="flex flex-col sm:flex-row sm:gap-4 space-y-4 sm:space-y-0">
                            <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-800/30 border border-neutral-800 transition-all hover:bg-zinc-800/50 hover:border-white/10">
                                <div className="p-2 bg-blue-500/10 rounded-xl">
                                    <Globe className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-white">Cloud Storage</h3>
                                    <p className="text-xs text-zinc-500">Persistent, accessible anywhere</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-800/30 border border-neutral-800 transition-all hover:bg-zinc-800/50 hover:border-white/10">
                                <div className="p-2 bg-emerald-500/10 rounded-xl">
                                    <Rocket className="w-5 h-5 text-emerald-400" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-white">Lightning Fast</h3>
                                    <p className="text-xs text-zinc-500">Real-time sync and decentralized performance</p>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                                {error}
                            </div>
                        )}

                        {provider === 'supabase' ? (
                            <form onSubmit={handleSignIn} className="space-y-4">
                                {isSignUp && (
                                    <input
                                        type="text"
                                        placeholder="Username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full bg-zinc-800/50 border border-neutral-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
                                        required={isSignUp}
                                    />
                                )}
                                <input
                                    type="email"
                                    placeholder="Email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-zinc-800/50 border border-neutral-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
                                    required
                                />
                                <input
                                    type="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-zinc-800/50 border border-neutral-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
                                    required
                                />
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full relative group overflow-hidden px-6 py-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold text-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 shadow-xl shadow-indigo-600/20"
                                >
                                    <div className="flex items-center justify-center gap-3">
                                        {loading ? (
                                            <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                                                <Shield className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </div>
                                </button>
                                <div className="text-center mt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsSignUp(!isSignUp)}
                                        className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors"
                                    >
                                        {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <button
                                onClick={() => handleSignIn()}
                                disabled={loading}
                                className="w-full relative group overflow-hidden px-6 py-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold text-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 shadow-xl shadow-indigo-600/20"
                            >
                                <div className="flex items-center justify-center gap-3">
                                    {loading ? (
                                        <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <span>Sign in with Puter</span>
                                            <Shield className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </div>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
