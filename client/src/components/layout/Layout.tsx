import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  LayoutDashboard,
  BookOpen,
  Timer,
  UploadCloud,
  Settings,
  Sun,
  Moon,
  Heart,
  LogOut,
  Target,
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/practice', label: 'Practice', icon: BookOpen },
  { path: '/exam', label: 'Exam Mode', icon: Timer },
  { path: '/upload', label: 'Upload Materials', icon: UploadCloud },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col transition-colors duration-200">
      {/* Top Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40 backdrop-blur-md bg-opacity-95">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg md:text-xl text-text-primary tracking-tight">
                REVIEW<span className="text-primary">site</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Top Notcher
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1.5">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User profile & theme controls */}
          <div className="flex items-center gap-3">
            {/* Quick theme toggle */}
            <div className="flex items-center bg-bg-secondary border border-border rounded-full p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`p-1.5 rounded-full transition ${
                  theme === 'light'
                    ? 'bg-card text-amber-500 shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                title="Light Theme"
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`p-1.5 rounded-full transition ${
                  theme === 'dark'
                    ? 'bg-card text-blue-400 shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                title="Dark Theme"
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setTheme('pink')}
                className={`p-1.5 rounded-full transition ${
                  theme === 'pink'
                    ? 'bg-card text-rose-500 shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                title="Pink Theme"
              >
                <Heart className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* User display & logout */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 pl-2 sm:pl-2.5 border-l border-border">
              <span className="hidden sm:inline-block text-sm font-semibold text-text-primary">
                {user?.displayName}
              </span>
              <button
                type="button"
                onClick={logout}
                className="text-danger p-1.5 px-2 rounded-xl border border-danger/20 bg-danger/10 hover:bg-danger hover:text-white transition active:scale-95 flex items-center gap-1"
                title="Switch Reviewer / Log out"
                aria-label="Switch Reviewer"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="text-[11px] font-bold">Switch</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Page Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 pb-24 md:pb-12">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 px-2 py-1 shadow-lg backdrop-blur-md bg-opacity-95">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[11px] font-medium transition ${
                  active ? 'text-primary font-bold' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <Icon className="w-5 h-5 mb-0.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
