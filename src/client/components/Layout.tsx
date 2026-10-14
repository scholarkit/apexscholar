import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
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
  Compass,
  BookOpen,
  FileCode,
  Sun,
  Moon,
  User,
  X,
} from 'lucide-react';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import BrainModal from './BrainModal';
import Breadcrumbs from './Breadcrumbs';
import ContextInspector from './ContextInspector';
import { ErrorBoundary } from './ErrorBoundary';
import { NotificationBell } from './NotificationCenter';
import { auth, type User as AuthUser } from '../lib/auth';
import { useTheme } from '../contexts/ThemeContext';
import { useProject } from '../contexts/ProjectContext';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { resolvedTheme, setTheme } = useTheme();
  const { activeProject } = useProject();

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) return true;
    const saved = localStorage.getItem('apex-sidebar-collapsed');
    return saved === 'true';
  });
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

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('apex-sidebar-collapsed', String(next));
      return next;
    });
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const handleSignOut = async () => {
    if (!confirm('Are you sure you want to sign out?')) return;
    setSigningOut(true);
    try {
      await auth.signOut();
      window.location.reload();
    } catch (error) {
      console.error('Error signing out:', error);
      setSigningOut(false);
    }
  };

  const navSections = [
    {
      title: 'Workspace',
      items: [
        { path: '/', icon: Home, label: 'Dashboard' },
        { path: '/projects', icon: SquareChartGantt, label: 'Projects' },
        { path: '/todos', icon: ListTodo, label: 'Todos' },
        { path: '/timetable', icon: CalendarDays, label: 'Timetable' },
      ],
    },
    {
      title: 'Research',
      items: [
        { path: '/explore', icon: Compass, label: 'Explore' },
        { path: '/journal', icon: BookOpen, label: 'Journal' },
        { path: '/composr', icon: FileCode, label: 'Composr', beta: true },
        { path: '/funding', icon: Landmark, label: 'Grants' },
        { path: '/vimeo-downloader', icon: Film, label: 'Subtitles' },
      ],
    },
    {
      title: 'System',
      items: [
        { path: '/settings', icon: Settings, label: 'Settings' },
        { path: '/about', icon: Info, label: 'About' },
      ],
    },
  ];

  // Bottom tab bar primary items for mobile
  const bottomTabItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/projects', icon: SquareChartGantt, label: 'Projects' },
    { path: '/journal', icon: BookOpen, label: 'Journal' },
    { path: '/explore', icon: Compass, label: 'Explore' },
  ];

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
          'hidden md:flex relative z-30 flex-shrink-0 flex-col transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] select-none',
          isCollapsed ? 'w-[68px]' : 'w-60'
        )}
        style={{ background: 'var(--color-bg)', borderRight: '1px solid var(--color-border)' }}
      >
        {/* Collapse Toggle */}
        <button
          onClick={toggleCollapse}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="absolute -right-3.5 top-5 w-7 h-7 rounded-full flex items-center justify-center z-40 transition-all duration-200 shadow-xs border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:scale-105 active:scale-95"
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>

        {/* Logo Header */}
        <div
          className={cn(
            'h-16 px-4 flex items-center border-b border-[var(--color-border)]',
            isCollapsed ? 'justify-center px-2' : 'justify-between'
          )}
        >
          <Link to="/" className="flex items-center gap-2.5 min-w-0 group">
            <img
              src="/logo-transparent.png"
              alt="logo"
              className="w-8 h-8 flex-shrink-0 group-hover:scale-105 transition-transform"
            />
            {!isCollapsed && (
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold text-sm tracking-tight text-[var(--color-text)] truncate">
                  Apex Scholar
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider bg-[var(--color-surface-2)] text-[var(--color-text-faint)] border border-[var(--color-border)]">
                  OS
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* Grouped Nav List */}
        <nav className="flex-1 px-2.5 py-3 space-y-4 overflow-y-auto custom-scrollbar">
          {navSections.map((section, idx) => (
            <div key={section.title}>
              {!isCollapsed ? (
                <div className="px-2 pb-1.5 pt-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-faint)]">
                  {section.title}
                </div>
              ) : (
                idx > 0 && <div className="border-t border-[var(--color-border)] my-2 mx-1" />
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive =
                    item.path === '/'
                      ? location.pathname === '/'
                      : location.pathname.startsWith(item.path);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      title={isCollapsed ? item.label : undefined}
                      className={cn(
                        'flex items-center rounded-lg text-xs font-medium transition-all duration-150 group active:scale-[0.98]',
                        isCollapsed ? 'justify-center w-10 h-10 mx-auto' : 'gap-2.5 px-2.5 py-2',
                        isActive
                          ? 'bg-[var(--color-surface-hover)] text-[var(--color-text)] font-semibold shadow-xs'
                          : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]/70 hover:text-[var(--color-text)]'
                      )}
                    >
                      <Icon
                        className={cn(
                          'w-4 h-4 flex-shrink-0 transition-colors duration-150',
                          isActive
                            ? 'text-[var(--color-accent)]'
                            : 'text-[var(--color-text-muted)] group-hover:text-[var(--color-text)]'
                        )}
                      />
                      {!isCollapsed && (
                        <div className="flex items-center justify-between flex-1 min-w-0">
                          <span className="truncate">{item.label}</span>
                          {item.beta && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                              Beta
                            </span>
                          )}
                          {isActive && !item.beta && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] ml-auto" />
                          )}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom Utility & Profile Panel */}
        <div className="p-2.5 space-y-1.5 border-t border-[var(--color-border)] bg-[var(--color-bg)]">
          {/* Brain / Nexus AI Trigger */}
          <button
            onClick={() => setShowBrain(true)}
            title={isCollapsed ? 'Brain AI (Ctrl+B)' : undefined}
            className={cn(
              'flex items-center rounded-lg text-xs font-medium transition-all duration-150 group active:scale-[0.98]',
              'bg-[var(--color-surface)] hover:bg-indigo-500/10 border border-[var(--color-border)] hover:border-indigo-500/30 text-[var(--color-text)]',
              isCollapsed ? 'justify-center w-10 h-10 mx-auto' : 'gap-2.5 px-2.5 py-2 w-full'
            )}
          >
            <Brain className="w-4 h-4 text-indigo-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
            {!isCollapsed && (
              <>
                <span className="truncate">Brain AI</span>
                <kbd className="kbd-badge ml-auto">⌘B</kbd>
              </>
            )}
          </button>

          {/* Theme Switcher Button */}
          <button
            onClick={toggleTheme}
            title={
              isCollapsed
                ? `Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`
                : undefined
            }
            className={cn(
              'flex items-center rounded-lg text-xs font-medium transition-all duration-150 group active:scale-[0.98]',
              'hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
              isCollapsed ? 'justify-center w-10 h-10 mx-auto' : 'gap-2.5 px-2.5 py-2 w-full'
            )}
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 flex-shrink-0" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            )}
            {!isCollapsed && (
              <span className="truncate">
                {resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </span>
            )}
          </button>

          {/* User Profile & Sign Out */}
          <div
            className={cn(
              'pt-1.5 border-t border-[var(--color-border)]/60',
              isCollapsed ? 'flex flex-col items-center gap-1.5' : 'flex items-center justify-between gap-2'
            )}
          >
            {isCollapsed ? (
              <>
                <div
                  title={user?.email || user?.username || 'User Profile'}
                  className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-xs flex-shrink-0"
                >
                  {user ? initials : <User className="w-3.5 h-3.5" />}
                </div>
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  title="Sign Out"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-all disabled:opacity-50"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-xs flex-shrink-0">
                    {user ? initials : <User className="w-3.5 h-3.5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate text-[var(--color-text)]">
                      {user?.username || 'Scholar'}
                    </p>
                    <p
                      className="text-[10px] truncate text-[var(--color-text-muted)]"
                      title={user?.email || ''}
                    >
                      {user?.email || 'Local Vault'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  title="Sign Out"
                  className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-all disabled:opacity-50"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* ──────────────────────────────────────────────
          MOBILE DRAWER OVERLAY  (shown on mobile only)
      ────────────────────────────────────────────── */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Slide-in Drawer */}
      <div
        className={cn(
          'md:hidden fixed top-0 left-0 h-full w-72 z-50 flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-2xl',
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ background: 'var(--color-bg)', borderRight: '1px solid var(--color-border)' }}
      >
        {/* Drawer Header */}
        <div
          className="flex items-center justify-between px-4 h-16"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center gap-2.5">
            <img src="/logo-transparent.png" alt="logo" className="w-8 h-8" />
            <span className="font-semibold text-sm tracking-tight text-[var(--color-text)]">
              Apex Scholar
            </span>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-all"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Nav Sections */}
        <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto custom-scrollbar">
          {navSections.map((section) => (
            <div key={section.title}>
              <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-faint)]">
                {section.title}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive =
                    item.path === '/'
                      ? location.pathname === '/'
                      : location.pathname.startsWith(item.path);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150',
                        isActive
                          ? 'bg-[var(--color-surface-hover)] text-[var(--color-text)] font-semibold'
                          : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]/70 hover:text-[var(--color-text)]'
                      )}
                    >
                      <Icon
                        className={cn(
                          'w-4 h-4 flex-shrink-0',
                          isActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'
                        )}
                      />
                      <span className="flex-1">{item.label}</span>
                      {item.beta && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          Beta
                        </span>
                      )}
                      {isActive && !item.beta && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Drawer Actions */}
        <div className="p-3 space-y-1.5 border-t border-[var(--color-border)] bg-[var(--color-bg)]">
          <button
            onClick={() => {
              setShowBrain(true);
              setDrawerOpen(false);
            }}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium w-full bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-indigo-500/30 text-[var(--color-text)] transition-all"
          >
            <Brain className="w-4 h-4 text-indigo-400" />
            <span>Brain AI</span>
            <kbd className="kbd-badge ml-auto">⌘B</kbd>
          </button>

          <button
            onClick={toggleTheme}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium w-full hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-400" />
            )}
            <span>{resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-xs">
                {user ? initials : <User className="w-3.5 h-3.5" />}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate text-[var(--color-text)]">
                  {user?.username || 'Scholar'}
                </p>
                <p className="text-[10px] truncate text-[var(--color-text-muted)]">
                  {user?.email || 'Local Vault'}
                </p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-all disabled:opacity-50"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────
          MAIN CONTENT AREA & TOPBAR
      ────────────────────────────────────────────── */}
      <main
        ref={mainRef}
        className="flex-1 overflow-auto relative custom-scrollbar flex flex-col"
        style={{ WebkitOverflowScrolling: 'touch', willChange: 'scroll-position' }}
      >
        {/* Desktop & Mobile Header Bar */}
        <header className="sticky top-0 z-20 min-h-[64px] border-b border-[var(--color-border)] px-4 sm:px-8 lg:px-10 flex items-center justify-between bg-[var(--color-bg)]/90 backdrop-blur-md transition-all duration-200">
          {/* Left: Hamburger (mobile) + Breadcrumbs */}
          <div className="flex items-center gap-3 sm:gap-5 min-w-0 py-2">
            <button
              onClick={() => setDrawerOpen(true)}
              className="md:hidden w-10 h-10 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] transition-all flex-shrink-0"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Breadcrumbs />
          </div>

          {/* Right: Actions Cluster */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 py-2">
            {activeProject && (
              <Link
                to="/projects"
                className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all shadow-xs"
                title="Active Project"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                <span className="truncate max-w-[150px]">{activeProject.name}</span>
              </Link>
            )}

            {/* Theme Toggle Quick Button */}
            <button
              onClick={toggleTheme}
              title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] bg-[var(--color-surface)] transition-all shadow-xs"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-400" />
              )}
            </button>

            {/* Notification Bell */}
            <NotificationBell />

            {/* Quick Brain AI trigger */}
            <button
              onClick={() => setShowBrain(true)}
              title="Brain AI (Ctrl+B)"
              className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 hover:text-indigo-300 transition-all active:scale-[0.98] shadow-xs"
            >
              <Brain className="w-4 h-4" />
              <span>Brain</span>
              <kbd className="text-[10px] font-mono opacity-60">⌘B</kbd>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="relative p-4 sm:p-8 w-full max-w-7xl mx-auto min-h-full flex-1">
          {children}
        </div>

        {/* Linear Right-Hand Context Inspector */}
        <ContextInspector />

        {/* ──────────────────────────────────────────────
            MOBILE BOTTOM TAB BAR
        ────────────────────────────────────────────── */}
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around px-2 py-1.5 backdrop-blur-md safe-area-bottom"
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
                className="relative flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-all duration-150 group min-w-0"
              >
                {isActive && (
                  <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-indigo-500" />
                )}
                <Icon
                  className={cn(
                    'w-4 h-4 flex-shrink-0 transition-colors duration-150',
                    isActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'
                  )}
                />
                <span
                  className={cn(
                    'text-[10px] font-medium truncate max-w-[56px] transition-colors duration-150',
                    isActive ? 'text-[var(--color-text)]' : 'text-[var(--color-text-faint)]'
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* "More" button opens drawer */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-all duration-150 group"
          >
            <Menu className="w-4 h-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-text)] transition-colors" />
            <span className="text-[10px] font-medium text-[var(--color-text-faint)] group-hover:text-[var(--color-text-muted)] transition-colors">
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
                <button
                  onClick={() => setShowBrain(false)}
                  className="text-sm text-zinc-400 hover:text-white underline"
                >
                  Close
                </button>
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
