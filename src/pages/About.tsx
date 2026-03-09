import { Heart, Coffee, CreditCard, Sparkles, Code2, Globe, Mail, BookOpen } from 'lucide-react';

export default function About() {
    return (
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-8 animate-in fade-in duration-500 pb-12">
            {/* Header */}
            <header className="text-center space-y-4 pt-12 pb-6 border-b    border-neutral-800">
                <div className="inline-flex items-center justify-center p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 mb-2">
                    <Heart className="w-8 h-8 text-indigo-500" fill="currentColor" />
                </div>
                <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white">About the Project</h1>
                <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto">
                    Apex Scholar is a passion project built to democratize and accelerate academic research.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Why this passion project */}
                <div className="bg-zinc-900/40 border    border-neutral-800 rounded-xl p-4 sm:p-8 space-y-4 hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-3 mb-6">
                        <Sparkles className="w-6 h-6 text-amber-400" />
                        <h2 className="text-2xl font-semibold text-white">Why build this?</h2>
                    </div>
                    <div className="space-y-4 text-zinc-300 leading-relaxed text-sm lg:text-base">
                        <p>
                            Academic tools are often scattered, outdated, or prohibitively expensive. Researchers waste countless hours juggling PDFs, formatting citations, and switching between completely disconnected applications.
                        </p>
                        <p>
                            <strong>Apex Scholar</strong> is my attempt to fix that. I wanted to build a single, beautiful, cohesive workspace that leverages modern web technologies and AI.
                        </p>
                        <p>
                            By keeping it open and running mostly local/browser-first (via Puter.js), your data remains yours, and the friction of discovery, writing, and analysis is dramatically reduced.
                        </p>
                    </div>
                </div>

                {/* Who am I */}
                <div className="bg-zinc-900/40 border    border-neutral-800 rounded-xl p-4 sm:p-8 space-y-4 hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-3 mb-6">
                        <Code2 className="w-6 h-6 text-emerald-400" />
                        <h2 className="text-2xl font-semibold text-white">Who am I?</h2>
                    </div>
                    <div className="space-y-4 text-zinc-300 leading-relaxed text-sm lg:text-base">
                        <p>
                            I'm an independent developer and a research enthusiast who believes that better tools lead to better science and accelerated human progress.
                        </p>
                        <p>
                            I spend my nights and weekends designing and coding applications that solve real-world frustrations. When I'm not writing code, I'm usually reading papers, exploring new web architectures, or drinking absurd amounts of coffee.
                        </p>
                        <div className="pt-4 flex flex-col gap-3">
                            <div className="flex flex-wrap items-center gap-3">
                                <a href="https://github.com/sathwik-14" target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-sm font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 px-4 py-2 rounded-full transition-colors">
                                    <Globe className="w-4 h-4" /> GitHub Profile
                                </a>
                                <a href="mailto:kywagle@gmail.com"
                                    className="inline-flex items-center gap-2 text-sm font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 px-4 py-2 rounded-full transition-colors">
                                    <Mail className="w-4 h-4" /> kywagle@gmail.com
                                </a>
                            </div>
                            <p className="text-xs text-zinc-500 mt-1">
                                Feel free to reach out for any issues, bugs, or feature requests!
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Support Section */}
            <section className="bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-4 sm:p-8 md:p-12 text-center mt-12">
                <h2 className="text-3xl font-bold text-white mb-4">Support the Development</h2>
                <p className="text-indigo-200/80 max-w-2xl mx-auto mb-10 leading-relaxed">
                    This project is and will remain free to use. If you find it valuable for your research workflow, consider supporting its continued development, server costs, and open-source maintenance. There are a few ways to help:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">

                    {/* Buy Me a Coffee */}
                    <a href="https://buymeacoffee.com/kywagle" className="group flex flex-col items-center p-6 bg-zinc-900 border    border-neutral-800 hover:border-[#FFDD00]/50 rounded-xl transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#FFDD00]/10">
                        <div className="w-12 h-12 bg-[#FFDD00]/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Coffee className="w-6 h-6 text-[#FFDD00]" />
                        </div>
                        <h3 className="text-white font-semibold mb-1">Buy me a Coffee</h3>
                        <p className="text-xs text-zinc-400">Coffee fuels code. Global support via card or PayPal.</p>
                    </a>

                    {/* UPI */}
                    <button onClick={() => alert('UPI ID: kywagle@okaxis')} className="group flex flex-col items-center p-6 bg-zinc-900 border    border-neutral-800 hover:border-emerald-500/50 rounded-xl transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/10 text-left">
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            {/* Using a custom span for UPI look, or just CreditCard */}
                            <span className="text-emerald-400 font-bold text-lg leading-none tracking-tighter">UPI</span>
                        </div>
                        <h3 className="text-white font-semibold mb-1 w-full text-center">UPI Transfer</h3>
                        <p className="text-xs text-zinc-400 text-center">Fast, zero-fee direct support for users in India.</p>
                    </button>

                    {/* Razorpay */}
                    {/* <a href="#" className="group flex flex-col items-center p-6 bg-zinc-900 border    border-neutral-800 hover:border-[#0288D1]/50 rounded-xl transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#0288D1]/10">
                        <div className="w-12 h-12 bg-[#0288D1]/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <CreditCard className="w-6 h-6 text-[#0288D1]" />
                        </div>
                        <h3 className="text-white font-semibold mb-1">Razorpay</h3>
                        <p className="text-xs text-zinc-400">Secure payments and subscriptions in INR.</p>
                    </a> */}

                </div>
            </section>

        </div>
    );
}
