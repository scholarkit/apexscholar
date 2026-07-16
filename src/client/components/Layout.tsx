import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BookMarked,
  Brain,
  ChevronLeft,
  ChevronRight,
  Home,
  Info,
  Landmark,
  Film,
  LogOut,
  Menu,
  Settings,
  SquareChartGantt,
  ListTodo,
  CalendarDays,
  User,
  X,
} from 'lucide-react';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import BrainModal from './BrainModal';
import { ErrorBoundary } from './ErrorBoundary';
import { NotificationBell } from './NotificationCenter';
import { auth, type User as AuthUser } from '../lib/auth';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(window.innerWidth < 1024);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
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
    getUser();
  }, []);

  // Ctrl+B / ⌘+B to toggle Brain modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setShowBrain((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  async function getUser() {
    const userData = await auth.getUser();
    setUser(userData);
  }

  const handleSignOut = async () => {
    if (!confirm('Are you sure you want to sign out?')) return;
    setSigningOut(true);
    try {
      await auth.signOut();
      window.location.reload();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const navItems: { path: string; icon: any; label: string; beta?: boolean }[] = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/projects', icon: SquareChartGantt, label: 'Projects' },
    { path: '/todos', icon: ListTodo, label: 'Todos' },
    { path: '/timetable', icon: CalendarDays, label: 'Timetable' },
    { path: '/funding', icon: Landmark, label: 'Funding & Grants' },
    { path: '/vimeo-downloader', icon: Film, label: 'Subtitles' },
    { path: '/settings', icon: Settings, label: 'Settings' },
    { path: '/about', icon: Info, label: 'About' },
  ];

  // Bottom tab bar shows first 5 items; remaining accessible via drawer
  const bottomTabItems = navItems.slice(0, 5);

  const initials = user?.username ? user.username.slice(0, 2).toUpperCase() : '?';

  return (
    <div
      className="flex h-[100dvh] font-sans selection:bg-indigo-500/30 overflow-hidden"
      style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      {/* ──────────────────────────────────────────────
          DESKTOP SIDEBAR  (hidden on mobile)
      ────────────────────────────────────────────── */}
      <aside
        className={cn(
          'hidden md:flex relative z-20 flex-shrink-0 flex-col transition-all duration-300 ease-in-out',
          isCollapsed ? 'w-16' : 'w-64'
        )}
        style={{ background: 'var(--color-bg)', borderRight: '1px solid var(--color-border)' }}
      >
        {/* Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-12 w-6 h-6 rounded-full flex items-center justify-center z-50"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
          }}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Logo */}
        <div
          className={cn('px-2 py-4 flex items-center', isCollapsed ? 'justify-center' : 'gap-2')}
        >
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
                  'flex items-center rounded-xl text-sm font-medium transition-all duration-200 group',
                  isCollapsed ? 'justify-center w-10 h-10 mx-auto' : 'gap-3 px-3 py-2.5',
                  isActive ? 'bg-[--bg-surface] text-[--color-accent]' : 'hover:bg-white/5'
                )}
                style={!isActive ? { color: 'var(--color-text-muted)' } : undefined}
              >
                <Icon
                  className={cn(
                    'w-5 h-5 flex-shrink-0',
                    isActive
                      ? 'text-indigo-500'
                      : 'text-zinc-500 group-hover:text-[var(--color-accent)]'
                  )}
                />
                {!isCollapsed && (
                  <div>
                    <span className="animate-in fade-in slide-in-from-left-1 duration-300">
                      {item.label}
                    </span>
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

        {/* Notification Bell */}
        <div className={cn('px-3 mb-1', isCollapsed && 'flex justify-center')}>
          <NotificationBell>
            {!isCollapsed && (
              <span className="animate-in fade-in slide-in-from-left-1 duration-300">
                Notifications
              </span>
            )}
          </NotificationBell>
        </div>

        {/* Brain Button */}
        <div className={cn('px-3 mb-2', isCollapsed && 'flex justify-center')}>
          <button
            onClick={() => setShowBrain(true)}
            title={isCollapsed ? 'Brain (Ctrl+B)' : undefined}
            className={cn(
              'flex items-center rounded-xl text-sm font-medium transition-all duration-200 group',
              'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 text-[var(--color-accent)] hover:from-indigo-500/20 hover:to-purple-500/20',
              isCollapsed ? 'justify-center w-10 h-10' : 'gap-3 px-3 py-2.5 w-full'
            )}
          >
            <Brain className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && (
              <span className="animate-in fade-in slide-in-from-left-1 duration-300">Nexus</span>
            )}
            {!isCollapsed && (
              <kbd className="ml-auto text-[10px] text-zinc-600 bg-[var(--color-surface)] px-1.5 py-0.5 rounded font-mono border border-white/5">
                ⌘ B
              </kbd>
            )}
          </button>
        </div>

        {/* User Profile Footer */}
        <div
          className={cn('p-4', isCollapsed ? 'flex flex-col items-center gap-3' : 'space-y-3')}
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          {isCollapsed ? (
            <>
              <div
                title={user?.email || user?.username || 'User'}
                className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-sm flex-shrink-0"
              >
                {user ? initials : <User className="w-4 h-4" />}
              </div>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                title="Sign Out"
                className="w-10 h-10 rounded-xl flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-400/10 border border-transparent hover:border-red-400/20 transition-all"
              >
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
                  <p
                    className="text-sm font-semibold truncate"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {user?.username || 'Loading...'}
                  </p>
                  <p
                    className="text-xs truncate whitespace-nowrap overflow-hidden text-ellipsis"
                    style={{ color: 'var(--color-text-muted)' }}
                    title={user?.email || ''}
                  >
                    {user?.email || 'Account'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-400/10 border border-transparent hover:border-red-400/20 transition-all disabled:opacity-50"
              >
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
      <div
        className={cn(
          'md:hidden fixed top-0 left-0 h-full w-72 z-50 flex flex-col transition-transform duration-300 ease-in-out',
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ background: 'var(--color-bg)', borderRight: '1px solid var(--color-border)' }}
      >
        {/* Drawer Header */}
        <div
          className="flex items-center justify-between px-4 py-4"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
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
                  'flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 group',
                  isActive ? 'bg-white/10' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                )}
              >
                <Icon
                  className={cn(
                    'w-5 h-5 flex-shrink-0',
                    isActive ? 'text-indigo-500' : 'text-zinc-500 group-hover:text-zinc-300'
                  )}
                />
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
            onClick={() => {
              setShowBrain(true);
              setDrawerOpen(false);
            }}
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium w-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 text-indigo-300 hover:from-indigo-500/20 hover:to-purple-500/20 hover:text-indigo-200 transition-all duration-200"
          >
            <Brain className="w-5 h-5 flex-shrink-0" />
            <span>Brain</span>
            <kbd className="ml-auto text-[10px] text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded font-mono border border-white/5">
              ⌘B
            </kbd>
          </button>
        </div>

        {/* Notification Bell (mobile drawer) */}
        <div className="px-3 mb-2">
          <NotificationBell>
            <span>Notifications</span>
          </NotificationBell>
        </div>

        {/* Drawer Footer — user + sign out */}
        <div className="p-4 space-y-3" style={{ borderTop: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-3 rounded-xl">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-sm flex-shrink-0">
              {user ? initials : <User className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                {user?.username || 'Loading...'}
              </p>
              <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }} title={user?.email || ''}>
                {user?.email || 'Account'}
              </p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-400/10 border border-transparent hover:border-red-400/20 transition-all disabled:opacity-50"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {signingOut ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
      </div>

      {/* ──────────────────────────────────────────────
          MAIN CONTENT
      ────────────────────────────────────────────── */}
      <main
        ref={mainRef}
        className="flex-1 overflow-auto relative custom-scrollbar flex flex-col"
        style={{ WebkitOverflowScrolling: 'touch', willChange: 'scroll-position' }}
      >
        <div className="absolute inset-0 pointer-events-none" />

        {/* Mobile top bar with hamburger */}
        <div
          className="md:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-md"
          style={{
            borderBottom: '1px solid var(--color-border)',
            background: 'color-mix(in srgb, var(--color-bg) 90%, transparent)',
          }}
        >
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
        <div className="relative p-6 sm:p-8 w-full min-h-full">{children}</div>

        {/* ──────────────────────────────────────────────
            MOBILE BOTTOM TAB BAR
        ────────────────────────────────────────────── */}
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around px-2 py-2 backdrop-blur-md safe-area-bottom"
          style={{
            borderTop: '1px solid var(--color-border)',
            background: 'color-mix(in srgb, var(--color-bg) 95%, transparent)',
          }}
        >
          {bottomTabItems.map((item) => {
            const isActive =
              item.path === '/'
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
                <Icon
                  className={cn(
                    'w-5 h-5 flex-shrink-0 transition-colors duration-200',
                    isActive ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-300'
                  )}
                />
                <span
                  className={cn(
                    'text-[10px] font-medium truncate max-w-[56px] transition-colors duration-200',
                    isActive ? 'text-indigo-400' : 'text-zinc-600 group-hover:text-zinc-400'
                  )}
                >
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
            <span className="text-[10px] font-medium text-zinc-600 group-hover:text-zinc-400 transition-colors">
              More
            </span>
          </button>
        </nav>
      </main>

      {/* Brain Modal */}
      {showBrain && (
        <ErrorBoundary
          fallback={
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 text-center max-w-sm">
                <p className="text-red-400 font-medium mb-2">Nexus encountered an error</p>
                <button onClick={() => setShowBrain(false)} className="text-sm text-zinc-400 hover:text-white underline">Close</button>
              </div>
            </div>
          }
        >
          <BrainModal onClose={() => setShowBrain(false)} />
        </ErrorBoundary>
      )}
    </div>
  );
}
