import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, BookOpen, FolderOpen, Lightbulb, BarChart2, ChevronLeft, ChevronRight, LogOut, User, Telescope, SquareKanban, Info, Settings } from 'lucide-react';
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

  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/explore', icon: Telescope, label: 'Explore', beta: true },
    { path: '/journal', icon: BookOpen, label: 'Journal' },
    { path: '/resources', icon: FolderOpen, label: 'Resources' },
    { path: '/kanban', icon: SquareKanban, label: 'Kanban Board' },
    { path: '/insights', icon: Lightbulb, label: 'Insights' },
    { path: '/analytics', icon: BarChart2, label: 'Analytics' },
    { path: '/settings', icon: Settings, label: 'Settings' },
    { path: '/about', icon: Info, label: 'About' }
  ];

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : '?';

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-indigo-500/30 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "relative z-20 flex-shrink-0 border-r border-white/10 bg-zinc-900/50 backdrop-blur-xl flex flex-col transition-all duration-300 ease-in-out",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        {/* Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-12 w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white border border-white/10 shadow-lg shadow-indigo-500/40 hover:bg-indigo-500 transition-colors z-50"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Logo */}
        <div className={cn("p-6 flex items-center", isCollapsed ? "justify-center" : "gap-2")}>
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex-shrink-0 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Lightbulb className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <h1 className="text-xl font-semibold tracking-tight text-white animate-in fade-in slide-in-from-left-2 duration-300">
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
                  "flex items-center rounded-lg text-sm font-medium transition-all duration-200 group",
                  isCollapsed ? "justify-center w-12 h-12 mx-auto" : "gap-3 px-3 py-2.5",
                  isActive
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                )}
              >
                <Icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-indigo-400" : "text-zinc-500 group-hover:text-zinc-300")} />
                {!isCollapsed && <div>
                  <span className="animate-in fade-in slide-in-from-left-1 duration-300">{item.label}</span>
                  {item.beta && (
                    <span className="ml-2 px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-wider">
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
                className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-sm flex-shrink-0"
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
                <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-sm flex-shrink-0">
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
      <main className="flex-1 overflow-auto bg-zinc-950 relative custom-scrollbar">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-zinc-950 to-zinc-950 pointer-events-none" />
        <div className="relative p-8 max-w-6xl mx-auto min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
