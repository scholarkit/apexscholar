import { useState } from 'react';
import { Check, Code2, Coffee, Copy, Globe, Heart, Mail, Sparkles } from 'lucide-react';

export default function About() {
  const [copiedUpi, setCopiedUpi] = useState(false);

  const handleCopyUpi = async () => {
    try {
      await navigator.clipboard.writeText('kywagle@okaxis');
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-32 sm:pb-8">
      {/* Header */}
      <header className="text-center space-y-4 pt-8 pb-4 border-b border-[var(--color-border)]">
        <div className="inline-flex items-center justify-center p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-500 mb-1">
          <Heart className="w-7 h-7" fill="currentColor" />
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[var(--color-text)]">
          About Apex Scholar
        </h1>
        <p className="text-base sm:text-lg text-[var(--color-text-muted)] max-w-2xl mx-auto leading-relaxed">
          An open, local-first research operating system built to accelerate scientific discovery and literature synthesis.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        {/* Why this project */}
        <div className="card-elevated rounded-2xl p-6 sm:p-8 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text)]">
                Why build this?
              </h2>
            </div>
            <div className="space-y-4 text-[var(--color-text-muted)] leading-relaxed text-sm sm:text-base">
              <p>
                Academic workflows are fragmented across paywalled citation managers, disjointed note apps, and isolated PDF viewers. Researchers waste hours context-switching.
              </p>
              <p>
                <strong className="text-[var(--color-text)] font-semibold">Apex Scholar</strong> brings literature discovery, synthesis journals, LaTeX drafting, and citation intelligence into a single coherent workspace.
              </p>
              <p>
                With browser-first local persistence and optional private sync, your research data stays in your control.
              </p>
            </div>
          </div>
        </div>

        {/* Creator Note */}
        <div className="card-elevated rounded-2xl p-6 sm:p-8 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                <Code2 className="w-5 h-5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text)]">
                Behind the Code
              </h2>
            </div>
            <div className="space-y-4 text-[var(--color-text-muted)] leading-relaxed text-sm sm:text-base">
              <p>
                Crafted by an independent software engineer passionate about open science, clean interfaces, and augmenting research velocity.
              </p>
              <p>
                Apex Scholar is built with precision: TypeScript, Vite, Tailwind CSS, TipTap, and local encrypted storage.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--color-border)] space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <a
                href="https://github.com/sathwik-14"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2 rounded-xl hover:bg-emerald-500/20 transition-all active:scale-[0.98]"
              >
                <Globe className="w-3.5 h-3.5" /> GitHub Profile
              </a>
              <a
                href="mailto:kywagle@gmail.com"
                className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3.5 py-2 rounded-xl hover:bg-indigo-500/20 transition-all active:scale-[0.98]"
              >
                <Mail className="w-3.5 h-3.5" /> kywagle@gmail.com
              </a>
            </div>
            <p className="text-[11px] text-[var(--color-text-muted)]">
              Questions, bug reports, and contributions are warmly welcomed.
            </p>
          </div>
        </div>
      </div>

      {/* Support Section */}
      <section className="card-elevated rounded-2xl p-6 sm:p-10 text-center relative overflow-hidden border-indigo-500/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <h2 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] mb-3">
          Support Independent Development
        </h2>
        <p className="text-[var(--color-text-muted)] max-w-xl mx-auto mb-8 text-sm sm:text-base leading-relaxed">
          Apex Scholar is free and open. If it powers your research workflow, consider supporting ongoing development, hosting, and updates.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
          {/* Buy Me a Coffee */}
          <a
            href="https://buymeacoffee.com/kywagle"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col items-center p-5 sm:p-6 bg-[var(--color-surface-2)]/80 border border-[var(--color-border)] hover:border-amber-400/40 rounded-2xl transition-all active:scale-[0.98] shadow-xs"
          >
            <div className="w-12 h-12 bg-amber-400/10 border border-amber-400/20 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Coffee className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="text-[var(--color-text)] font-semibold text-sm mb-1">Buy Me a Coffee</h3>
            <p className="text-xs text-[var(--color-text-muted)]">
              Support via Card or PayPal
            </p>
          </a>

          {/* UPI with Copy State */}
          <button
            type="button"
            onClick={handleCopyUpi}
            className="group flex flex-col items-center p-5 sm:p-6 bg-[var(--color-surface-2)]/80 border border-[var(--color-border)] hover:border-emerald-500/40 rounded-2xl transition-all active:scale-[0.98] text-center shadow-xs cursor-pointer"
          >
            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              {copiedUpi ? (
                <Check className="w-5 h-5 text-emerald-400" />
              ) : (
                <span className="text-emerald-400 font-bold text-base tracking-tight">UPI</span>
              )}
            </div>
            <h3 className="text-[var(--color-text)] font-semibold text-sm mb-1 flex items-center gap-1.5">
              {copiedUpi ? 'ID Copied to Clipboard!' : 'UPI Transfer'}
              {!copiedUpi && <Copy className="w-3.5 h-3.5 text-[var(--color-text-muted)] opacity-60" />}
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] font-mono">
              {copiedUpi ? 'kywagle@okaxis' : 'Direct zero-fee support (India)'}
            </p>
          </button>
        </div>
      </section>
    </div>
  );
}
