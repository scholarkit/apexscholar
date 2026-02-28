import { useState } from 'react';
import { Shield, Rocket, Globe } from 'lucide-react';
import { puterService } from '../lib/puter';

interface LoginProps {
    onLoginSuccess: () => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSignIn = async () => {
        setLoading(true);
        setError(null);
        try {
            const user = await puterService.signIn();
            if (user) {
                onLoginSuccess();
            } else {
                setError('Sign in cancelled or failed.');
            }
        } catch (err) {
            setError('An error occurred during sign in.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#09090b] selection:bg-indigo-500/30">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[25%] -left-[25%] w-[50%] h-[50%] bg-indigo-500/10 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute -bottom-[25%] -right-[25%] w-[50%] h-[50%] bg-purple-500/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            <div className="relative w-full max-w-md p-8">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-indigo-600/10 border border-indigo-500/20 mb-6 shadow-2xl shadow-indigo-500/10">
                        <Shield className="w-10 h-10 text-indigo-400" />
                    </div>
                    <h1 className="text-4xl font-bold text-white tracking-tight mb-3">
                        Apex Scholar
                    </h1>
                    <p className="text-zinc-400 text-lg">
                        Secure, decentralized research management.
                    </p>
                </div>

                <div className="bg-zinc-900/50 border border-white/5 backdrop-blur-xl rounded-3xl p-8 shadow-2xl overflow-hidden relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <div className="relative space-y-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-800/30 border border-white/5 transition-all hover:bg-zinc-800/50 hover:border-white/10">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <Globe className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-white">Cloud Storage</h3>
                                    <p className="text-xs text-zinc-500">Persistent, accessible anywhere via Puter.js</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-800/30 border border-white/5 transition-all hover:bg-zinc-800/50 hover:border-white/10">
                                <div className="p-2 bg-emerald-500/10 rounded-lg">
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

                        <button
                            onClick={handleSignIn}
                            disabled={loading}
                            className="w-full relative group overflow-hidden px-6 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 shadow-xl shadow-indigo-600/20"
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
                        <p className="text-center text-zinc-500 text-xs">
                            Powered by Puter.com Cloud OS
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
