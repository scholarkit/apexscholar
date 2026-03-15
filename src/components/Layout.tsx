import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home, BarChart2, ChevronLeft, ChevronRight, LogOut, User, Info,
  Settings, Landmark, BookMarked, SquareChartGantt, Menu, X, Brain
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { puterService, PuterUser } from '../lib/puter';
import BrainModal from './BrainModal';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(window.innerWidth < 1024);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [user, setUser] = useState<PuterUser | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const [showBrain, setShowBrain] = useState(false);

  // Close drawer and scroll to top on route change
  useEffect(() => {
    setDrawerOpen(false);
    if (mainRef.current) {
      mainRef.current.scrollTo(0, 0);
    }
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setIsCollapsed(true);
      if (window.innerWidth >= 1024) setDrawerOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    puterService.getUser().then(setUser);
  }, []);

  // Ctrl+B / ⌘+B to toggle Brain modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setShowBrain(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSignOut = async () => {
    if (!confirm('Are you sure you want to sign out?')) return;
    setSigningOut(true);
    await puterService.signOut();
    window.location.reload();
  };

  const navItems: { path: string; icon: any; label: string; beta?: boolean }[] = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/projects', icon: SquareChartGantt, label: 'Projects' },
    { path: '/funding', icon: Landmark, label: 'Funding & Grants' },
    { path: '/learn', icon: BookMarked, label: 'Learn' },
    { path: '/settings', icon: Settings, label: 'Settings' },
    { path: '/about', icon: Info, label: 'About' },
  ];

  // Bottom tab bar shows first 5 items; remaining accessible via drawer
  const bottomTabItems = navItems.slice(0, 5);

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : '?';

  return (
    <div className="flex h-[100dvh] font-sans selection:bg-indigo-500/30 overflow-hidden">

      {/* ──────────────────────────────────────────────
          DESKTOP SIDEBAR  (hidden on mobile)
      ────────────────────────────────────────────── */}
      <aside
        className={cn(
          "hidden md:flex relative z-20 flex-shrink-0 border-r border-neutral-900 flex-col transition-all duration-300 ease-in-out",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute bg-neutral-950 -right-3 top-12 w-6 h-6 rounded-full flex items-center justify-center text-white border border-neutral-800 z-50"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Logo */}
        <div className={cn("px-2 py-4 flex items-center", isCollapsed ? "justify-center" : "gap-2")}>
          <img src="/logo-transparent.png" alt="logo" className="w-12 h-12" />
          {!isCollapsed && <h1 className="logo-title">Apex Scholar</h1>}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                title={isCollapsed ? item.label : undefined}
                className={cn(
                  "flex items-center rounded-xl text-sm font-medium transition-all duration-200 group",
                  isCollapsed ? "justify-center w-10 h-10 mx-auto" : "gap-3 px-3 py-2.5",
                  isActive ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                )}
              >
                <Icon className={cn(
                  "w-5 h-5 flex-shrink-0",
                  isActive ? "text-indigo-500" : "text-zinc-500 group-hover:text-zinc-300",
                )} />
                {!isCollapsed && (
                  <div>
                    <span className="animate-in fade-in slide-in-from-left-1 duration-300">{item.label}</span>
                    {item.beta && (
                      <span className="ml-2 px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-500 text-[10px] font-bold uppercase tracking-wider">
                        Beta
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Brain Button */}
        <div className={cn("px-3 mb-2", isCollapsed && "flex justify-center")}>
          <button
            onClick={() => setShowBrain(true)}
            title={isCollapsed ? 'Brain (Ctrl+B)' : undefined}
            className={cn(
              "flex items-center rounded-xl text-sm font-medium transition-all duration-200 group",
              "bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 text-indigo-300 hover:from-indigo-500/20 hover:to-purple-500/20 hover:text-indigo-200",
              isCollapsed ? "justify-center w-10 h-10" : "gap-3 px-3 py-2.5 w-full"
            )}
          >
            <Brain className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && (
              <span className="animate-in fade-in slide-in-from-left-1 duration-300">Nexus</span>
            )}
            {!isCollapsed && (
              <kbd className="ml-auto text-[10px] text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded font-mono border border-white/5">⌘B</kbd>
            )}
          </button>
        </div>

        {/* User Profile Footer */}
        <div className={cn("p-4 border-t border-white/10", isCollapsed ? "flex flex-col items-center gap-3" : "space-y-3")}>
          {isCollapsed ? (
            <>
              <div title={user?.username || 'User'} className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-sm flex-shrink-0">
                {user ? initials : <User className="w-4 h-4" />}
              </div>
              <button onClick={handleSignOut} disabled={signingOut} title="Sign Out"
                className="w-10 h-10 rounded-xl flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-400/10 border border-transparent hover:border-red-400/20 transition-all">
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 rounded-xl">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-sm flex-shrink-0">
                  {user ? initials : <User className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{user?.username || 'Loading...'}</p>
                  <p className="text-xs text-zinc-500 truncate">Puter Account</p>
                </div>
              </div>
              <button onClick={handleSignOut} disabled={signingOut}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-400/10 border border-transparent hover:border-red-400/20 transition-all disabled:opacity-50">
                <LogOut className="w-4 h-4 flex-shrink-0" />
                <span className="animate-in fade-in slide-in-from-left-1 duration-300">
                  {signingOut ? 'Signing out...' : 'Sign Out'}
                </span>
              </button>
            </>
          )}
        </div>
      </aside>

      {/* ──────────────────────────────────────────────
          MOBILE DRAWER OVERLAY  (shown on mobile only)
      ────────────────────────────────────────────── */}
      {/* Backdrop */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Slide-in Drawer */}
      <div className={cn(
        "md:hidden fixed top-0 left-0 h-full w-72 z-50 flex flex-col border-r border-neutral-800 bg-neutral-950 transition-transform duration-300 ease-in-out",
        drawerOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <img src="/logo-transparent.png" alt="logo" className="w-9 h-9" />
            <h1 className="logo-title">Apex Scholar</h1>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Nav — all items */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 group",
                  isActive ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                )}
              >
                <Icon className={cn(
                  "w-5 h-5 flex-shrink-0",
                  isActive ? "text-indigo-500" : "text-zinc-500 group-hover:text-zinc-300"
                )} />
                <span>{item.label}</span>
                {item.beta && (
                  <span className="ml-auto px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-500 text-[10px] font-bold uppercase tracking-wider">
                    Beta
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Brain Button (mobile drawer) */}
        <div className="px-3 mb-2">
          <button
            onClick={() => { setShowBrain(true); setDrawerOpen(false); }}
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium w-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 text-indigo-300 hover:from-indigo-500/20 hover:to-purple-500/20 hover:text-indigo-200 transition-all duration-200"
          >
            <Brain className="w-5 h-5 flex-shrink-0" />
            <span>Brain</span>
            <kbd className="ml-auto text-[10px] text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded font-mono border border-white/5">⌘B</kbd>
          </button>
        </div>

        {/* Drawer Footer — user + sign out */}
        <div className="p-4 border-t border-white/10 space-y-3">
          <div className="flex items-center gap-3 rounded-xl">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-sm flex-shrink-0">
              {user ? initials : <User className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.username || 'Loading...'}</p>
              <p className="text-xs text-zinc-500 truncate">Puter Account</p>
            </div>
          </div>
          <button onClick={handleSignOut} disabled={signingOut}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-400/10 border border-transparent hover:border-red-400/20 transition-all disabled:opacity-50">
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {signingOut ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
      </div>

      {/* ──────────────────────────────────────────────
          MAIN CONTENT
      ────────────────────────────────────────────── */}
      <main ref={mainRef} className="flex-1 overflow-auto relative custom-scrollbar flex flex-col">
        <div className="absolute inset-0 pointer-events-none" />

        {/* Mobile top bar with hamburger */}
        <div className="md:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 border-b border-neutral-900 bg-neutral-950/90 backdrop-blur-md">
          <button
            onClick={() => setDrawerOpen(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <img src="/logo-transparent.png" alt="logo" className="w-7 h-7" />
            <span className="logo-title text-base">Apex Scholar</span>
          </div>
        </div>

        {/* Page content */}
        <div className="relative p-6 sm:p-8 w-full min-h-full">
          {children}
        </div>

        {/* ──────────────────────────────────────────────
            MOBILE BOTTOM TAB BAR
        ────────────────────────────────────────────── */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around px-2 py-2 border-t border-neutral-800 bg-neutral-950/95 backdrop-blur-md safe-area-bottom">
          {bottomTabItems.map((item) => {
            const isActive = item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 group min-w-0"
              >
                {isActive && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-indigo-500" />
                )}
                <Icon className={cn(
                  "w-5 h-5 flex-shrink-0 transition-colors duration-200",
                  isActive ? "text-indigo-400" : "text-zinc-500 group-hover:text-zinc-300"
                )} />
                <span className={cn(
                  "text-[10px] font-medium truncate max-w-[56px] transition-colors duration-200",
                  isActive ? "text-indigo-400" : "text-zinc-600 group-hover:text-zinc-400"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* "More" button opens drawer for the remaining items */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 group"
          >
            <Menu className="w-5 h-5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
            <span className="text-[10px] font-medium text-zinc-600 group-hover:text-zinc-400 transition-colors">More</span>
          </button>
        </nav>
      </main>

      {/* Brain Modal */}
      {showBrain && <BrainModal onClose={() => setShowBrain(false)} />}
    </div>
  );
}
