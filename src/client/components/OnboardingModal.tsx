import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, SkipForward, BookOpen, FolderOpen, Search, PenLine, BarChart3, Settings, Zap, Globe, Lock } from 'lucide-react';

const ONBOARDING_COMPLETE_KEY = 'apexscholar_onboarding_complete';

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  image?: string; // placeholder for actual image/GIF
  tips?: string[];
}

const steps: OnboardingStep[] = [
  {
    id: 1,
    title: "Welcome to Apex Scholar",
    description: "Your all-in-one research management platform. Let's take a quick tour to help you get started.",
    icon: <BookOpen className="w-16 h-16" />,
    tips: [
      "Secure, portable research workspace",
      "AI-powered insights and knowledge graphs",
      "End-to-end encryption for your data"
    ]
  },
  {
    id: 2,
    title: "Dashboard — Your Research Hub",
    description: "Get a quick overview of your research activity, recent entries, project stats, and milestones. Track your progress at a glance.",
    icon: <BarChart3 className="w-16 h-16" />,
    tips: [
      "View activity charts for custom time ranges",
      "See entry distribution by type",
      "Monitor recent milestones"
    ]
  },
  {
    id: 3,
    title: "Projects — Organize Your Work",
    description: "Create and manage research projects. Each project can have its own notes, resources, and kanban board. Track progress and collaborate.",
    icon: <FolderOpen className="w-16 h-16" />,
    tips: [
      "Create projects with start/end dates",
      "Add tags for easy filtering",
      "Switch between projects anytime"
    ]
  },
  {
    id: 4,
    title: "Resources — Build Your Library",
    description: "Search and save research papers from ArXiv, Google Scholar, PubMed, and more. Import from URLs, BibTeX, or add manually.",
    icon: <Search className="w-16 h-16" />,
    tips: [
      "Unified search across multiple sources",
      "Auto-extract metadata and PDFs",
      "Tag and categorize resources"
    ]
  },
  {
    id: 5,
    title: "Journal — Document Your Insights",
    description: "Keep a research journal with rich text, LaTeX support, and embedded resources. Document daily progress, ideas, and findings.",
    icon: <PenLine className="w-16 h-16" />,
    tips: [
      "Write with Markdown and LaTeX",
      "Attach resources and notes",
      "Compile LaTeX to PDF automatically"
    ]
  },
  {
    id: 6,
    title: "Explore — Discover New Research",
    description: "Browse trending papers, authors, and topics. Get personalized recommendations based on your interests and projects.",
    icon: <Globe className="w-16 h-16" />,
    tips: [
      "Search across all integrated sources",
      "Filter by date, source, and relevance",
      "Save directly to your resources"
    ]
  },
  {
    id: 7,
    title: "Kanban — Track Your Tasks",
    description: "Visual project management with drag-and-drop kanban boards. Columns for To Do, In Progress, Review, and Done.",
    icon: <Zap className="w-16 h-16" />,
    tips: [
      "Drag tasks between columns",
      "Add due dates and descriptions",
      "Sync with project entries"
    ]
  },
  {
    id: 8,
    title: "Insights — AI-Powered Analysis",
    description: "Let AI generate summaries, connect ideas, and surface patterns across your research. Get citations, context, and more.",
    icon: <BarChart3 className="w-16 h-16" />,
    tips: [
      "Auto-generated resource summaries",
      "Knowledge graph visualization",
      "Smart citation suggestions"
    ]
  },
  {
    id: 9,
    title: "Settings — Customize Your Experience",
    description: "Configure E2EE encryption, manage your account, toggle features, and set preferences. Keep your data secure.",
    icon: <Settings className="w-16 h-16" />,
    tips: [
      "Enable/disable end-to-end encryption",
      "Set your vault passphrase",
      "Configure API keys and integrations"
    ]
  },
  {
    id: 10,
    title: "You're All Set!",
    description: "You now have a complete overview of Apex Scholar. Start exploring and building your research empire!",
    icon: <Lock className="w-16 h-16" />,
    tips: [
      "Your data is encrypted and secure",
      "Sync across all your devices",
      "Need help? Check the documentation anytime"
    ]
  }
];

export default function OnboardingModal() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_COMPLETE_KEY);
    if (!completed) {
      // Show onboarding shortly after app loads
      const timer = setTimeout(() => setIsOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    setIsOpen(false);
  };

  const handleSkip = handleComplete;

  const goNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isOpen) return null;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-6xl mx-4 h-[90vh] flex flex-col bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl shadow-2xl overflow-hidden">

        {/* Header with progress and close */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-2 h-2 rounded-full transition-all ${idx <= currentStep ? 'bg-indigo-500' : 'bg-zinc-700'}`}
                />
              ))}
            </div>
            <span className="text-sm text-zinc-500">
              Step {currentStep + 1} of {steps.length}
            </span>
          </div>
          <button
            onClick={handleSkip}
            className="p-2 rounded-xl hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white"
            aria-label="Skip onboarding"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left side - Image/Visual */}
          <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 flex-col items-center justify-center p-12 relative">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute -top-20 -left-20 w-96 h-96 bg-indigo-500 blur-[100px] rounded-full" />
              <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-purple-500 blur-[100px] rounded-full" />
            </div>

            {/* Placeholder visual */}
            <div className="relative z-10 w-full aspect-square max-w-md rounded-3xl bg-[var(--color-surface)]/50 border border-[var(--color-border)] shadow-2xl flex items-center justify-center">
              <div className="text-center space-y-6">
                <div className="mx-auto w-32 h-32 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                  {step.icon}
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-zinc-400 font-medium uppercase tracking-wider">Step {step.id}</p>
                  <h2 className="text-3xl font-bold">{step.title}</h2>
                </div>
              </div>
            </div>

            {/* Tips */}
            {step.tips && (
              <div className="relative z-10 mt-12 w-full max-w-sm space-y-3">
                {step.tips.map((tip, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-4 rounded-xl bg-[var(--color-surface)]/50 border border-[var(--color-border)]">
                    <div className="w-2 h-2 mt-2 rounded-full bg-emerald-500 shrink-0" />
                    <p className="text-sm text-zinc-300">{tip}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right side - Text content */}
          <div className="flex-1 flex flex-col p-8 md:p-12 overflow-y-auto">
            {/* Mobile visual (only shown on small screens) */}
            <div className="md:hidden mb-8 p-8 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-[var(--color-border)] text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                {step.icon}
              </div>
              <p className="text-sm font-medium">Step {step.id}</p>
              <h2 className="text-2xl font-bold">{step.title}</h2>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-6">
              <div className="space-y-4">
                <h1 className="text-3xl md:text-4xl font-bold hidden md:block">{step.title}</h1>
                <p className="text-lg text-zinc-400 leading-relaxed">{step.description}</p>
              </div>

              {/* Feature highlights */}
              <div className="space-y-3 pt-4">
                {step.tips && step.tips.map((tip, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-2 h-2 mt-2 rounded-full bg-emerald-500 shrink-0" />
                    <p className="text-zinc-300">{tip}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-[var(--color-border)]">
              <button
                onClick={goBack}
                disabled={currentStep === 0}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
                Back
              </button>

              <div className="flex items-center gap-4">
                <button
                  onClick={handleSkip}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  <SkipForward className="w-5 h-5" />
                  <span className="hidden sm:inline">Skip</span>
                </button>
                <button
                  onClick={goNext}
                  className="flex items-center gap-2 px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                >
                  {isLastStep ? (
                    "Get Started"
                  ) : (
                    <>
                      Next
                      <ChevronRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile step indicator (dots) */}
        <div className="md:hidden flex justify-center gap-2 py-4 border-t border-[var(--color-border)]">
          {steps.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              className={`w-2 h-2 rounded-full transition-all ${idx === currentStep ? 'bg-indigo-500 w-4' : 'bg-zinc-700 hover:bg-zinc-600'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
