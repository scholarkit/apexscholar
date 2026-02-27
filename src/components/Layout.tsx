import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, BookOpen, FolderOpen, Lightbulb, BarChart2, Download, Upload, ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsCollapsed(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/journal', icon: BookOpen, label: 'Journal' },
    { path: '/resources', icon: FolderOpen, label: 'Resources' },
    { path: '/insights', icon: Lightbulb, label: 'Insights' },
    { path: '/analytics', icon: BarChart2, label: 'Analytics' },
  ];

  const handleBackup = () => {
    window.location.href = '/api/backup';
  };

  const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!confirm('Are you sure you want to restore this backup? This will overwrite all current data.')) {
      event.target.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/restore', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        alert('Backup restored successfully! The page will now reload.');
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Failed to restore backup: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Restore error:', error);
      alert('An error occurred while restoring the backup.');
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-indigo-500/30 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "relative z-20 flex-shrink-0 border-r border-white/10 bg-zinc-900/50 backdrop-blur-xl flex flex-col transition-all duration-300 ease-in-out",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        {/* Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-10 w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white border border-white/10 shadow-lg shadow-indigo-500/40 hover:bg-indigo-500 transition-colors z-50"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        <div className={cn("p-6 flex items-center", isCollapsed ? "justify-center" : "gap-2")}>
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex-shrink-0 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Lightbulb className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <h1 className="text-xl font-semibold tracking-tight text-white animate-in fade-in slide-in-from-left-2 duration-300">
              Research Pro
            </h1>
          )}
        </div>

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
                {!isCollapsed && <span className="animate-in fade-in slide-in-from-left-1 duration-300">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className={cn("p-4 border-t border-white/10 space-y-2", isCollapsed && "px-3")}>
          <button
            onClick={handleBackup}
            title={isCollapsed ? "Backup Data" : undefined}
            className={cn(
              "w-full flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium transition-colors",
              isCollapsed ? "h-12" : "gap-2 px-4 py-2"
            )}
          >
            <Download className="w-4 h-4" />
            {!isCollapsed && <span>Backup</span>}
          </button>

          <div className="relative">
            <input
              type="file"
              accept=".zip"
              onChange={handleRestore}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              id="restore-upload"
            />
            <button
              title={isCollapsed ? "Restore Backup" : undefined}
              className={cn(
                "z-10 w-full flex items-center justify-center bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 rounded-lg text-sm font-medium transition-colors",
                isCollapsed ? "h-12" : "gap-2 px-4 py-2"
              )}
            >
              <Upload className="w-4 h-4" />
              {!isCollapsed && <span>Restore</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-zinc-950 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-zinc-950 to-zinc-950 pointer-events-none" />
        <div className="relative p-8 max-w-6xl mx-auto min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
