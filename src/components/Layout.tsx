import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, BookOpen, FolderOpen, Lightbulb, BarChart2, ChevronLeft, ChevronRight, LogOut, User, Telescope, SquareKanban, Info, Settings, Landmark, BookMarked, SquareChartGantt } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { puterService, PuterUser } from '../lib/puter';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(window.innerWidth < 1024);
  const [user, setUser] = useState<PuterUser | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setIsCollapsed(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    puterService.getUser().then(setUser);
  }, []);

  const handleSignOut = async () => {
    if (!confirm('Are you sure you want to sign out?')) return;
    setSigningOut(true);
    await puterService.signOut();
    window.location.reload();
  };

  const navItems: { path: string; icon: any; label: string; beta?: boolean; hideOnMobile?: boolean }[] = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/projects', icon: SquareChartGantt, label: 'Projects' },
    { path: '/funding', icon: Landmark, label: 'Funding & Grants' },
    { path: '/analytics', icon: BarChart2, label: 'Analytics' },
    { path: '/learn', icon: BookMarked, label: 'Learn' },
    { path: '/settings', icon: Settings, label: 'Settings' },
    { path: '/about', icon: Info, label: 'About' }
  ];

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : '?';

  return (
    <div className="flex h-screen font-sans selection:bg-indigo-500/30 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "relative z-20 flex-shrink-0 border-r border-neutral-900 flex flex-col transition-all duration-300 ease-in-out",
          isCollapsed ? "w-20" : "w-64"
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
          <img src="/logo-transparent.png" alt="logo" className={cn(isCollapsed ? "w-8 h-8" : "w-12 h-12")} />
          {!isCollapsed && (
            <h1 className="logo-title">
              Apex Scholar
            </h1>
          )}
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
                  "items-center rounded-xl text-sm font-medium transition-all duration-200 group",
                  item.hideOnMobile ? "hidden sm:flex" : "flex",
                  isCollapsed ? "justify-center w-10 h-10 mx-auto" : "gap-3 px-3 py-2.5",
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                )}
              >
                <Icon className={cn(isActive ? "text-indigo-500" : "text-zinc-500 group-hover:text-zinc-300",
                  isCollapsed ? "w-4 h-4 flex-shrink-0" : "w-5 h-5 flex-shrink-0"
                )} />
                {!isCollapsed && <div>
                  <span className="animate-in fade-in slide-in-from-left-1 duration-300">{item.label}</span>
                  {item.beta && (
                    <span className="ml-2 px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-500 text-[10px] font-bold uppercase tracking-wider">
                      Beta
                    </span>
                  )}
                </div>}
              </Link>
            );
          })}
        </nav>

        {/* User Profile Footer */}
        <div className={cn("p-4 border-t border-white/10", isCollapsed ? "flex flex-col items-center gap-3" : "space-y-3")}>
          {isCollapsed ? (
            <>
              {/* Avatar only when collapsed */}
              <div
                title={user?.username || 'User'}
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
              {/* Full profile card */}
              <div className="flex items-center gap-3 rounded-xl animate-in fade-in slide-in-from-left-2 duration-300">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-sm flex-shrink-0">
                  {user ? initials : <User className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {user?.username || 'Loading...'}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">Puter Account</p>
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

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative custom-scrollbar">
        <div className="absolute inset-0 pointer-events-none" />
        <div className="relative p-4 sm:p-8 max-w-6xl mx-auto min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
