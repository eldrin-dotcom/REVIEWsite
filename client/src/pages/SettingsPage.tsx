import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Palette, Sun, Moon, Heart, User, Trophy, Check, RotateCcw, AlertTriangle, Users } from 'lucide-react';
import { useState } from 'react';
import type { Theme } from 'shared';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [resetting, setResetting] = useState(false);
  const [resetStatus, setResetStatus] = useState('');

  const handleResetProgress = async () => {
    if (!confirm('Are you sure you want to reset your progress? This will delete all your quiz history and accuracy scores for this account.')) {
      return;
    }

    setResetting(true);
    setResetStatus('');

    try {
      const res = await fetch('/api/progress/reset', {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setResetStatus('✓ Progress has been reset successfully. You now have a clean slate!');
      } else {
        alert(json.error || 'Failed to reset progress');
      }
    } catch (err) {
      console.error('Reset error:', err);
      alert('Error resetting progress.');
    } finally {
      setResetting(false);
    }
  };

  const themeOptions: Array<{
    id: Theme;
    name: string;
    icon: typeof Sun;
    description: string;
    colors: string[];
    iconColor: string;
  }> = [
    {
      id: 'light',
      name: 'Clean Light',
      icon: Sun,
      iconColor: 'text-amber-500',
      description: 'Crisp, high-contrast white and slate background with deep blue accents.',
      colors: ['#ffffff', '#f8fafc', '#2563eb', '#0f172a'],
    },
    {
      id: 'dark',
      name: 'Midnight Dark',
      icon: Moon,
      iconColor: 'text-blue-400',
      description: 'Gentle on the eyes for late-night review sessions with blue illumination.',
      colors: ['#0b1120', '#151e33', '#3b82f6', '#f8fafc'],
    },
    {
      id: 'pink',
      name: 'Blush Pink',
      icon: Heart,
      iconColor: 'text-rose-500',
      description: 'Soft pastel rose with warm pink buttons and charming cherry accents.',
      colors: ['#fff1f2', '#ffffff', '#f43f5e', '#881337'],
    },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 mb-2">
          <Palette className="w-3.5 h-3.5" /> Personalization
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
          Theme & Preferences
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          Customize your review experience. Your selected theme is synced to your profile across all your devices.
        </p>
      </div>

      {/* Theme Picker Cards */}
      <div className="space-y-3">
        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Choose Your Theme
        </label>

        <div className="grid grid-cols-1 gap-3">
          {themeOptions.map((opt) => {
            const isSelected = theme === opt.id;
            const Icon = opt.icon;

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTheme(opt.id)}
                className={`p-5 rounded-2xl border text-left flex items-start gap-4 transition active:scale-[0.99] ${
                  isSelected
                    ? 'border-primary ring-2 ring-primary ring-offset-2 bg-card shadow-md'
                    : 'border-border bg-card hover:border-primary/50 text-text-primary'
                }`}
              >
                <div className={`p-3 rounded-2xl bg-bg-secondary shrink-0 ${opt.iconColor}`}>
                  <Icon className="w-6 h-6" />
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-base text-text-primary">{opt.name}</span>
                    {isSelected && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-white bg-primary px-2.5 py-0.5 rounded-full shadow-xs">
                        <Check className="w-3 h-3" /> Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary mb-3 leading-relaxed">
                    {opt.description}
                  </p>

                  {/* Palette swatch preview */}
                  <div className="flex items-center gap-1.5">
                    {opt.colors.map((c, i) => (
                      <span
                        key={i}
                        className="w-5 h-5 rounded-full border border-black/10 inline-block shadow-xs"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Account Profile Card */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
          <User className="w-4 h-4 text-primary" /> Profile Information
        </h2>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="p-3.5 rounded-xl bg-bg-secondary border border-border">
            <span className="text-xs text-text-secondary block">Account Username</span>
            <span className="font-semibold text-text-primary mt-0.5 block">{user?.username}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-bg-secondary border border-border">
            <span className="text-xs text-text-secondary block">Display Name</span>
            <span className="font-semibold text-text-primary mt-0.5 block">{user?.displayName}</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-xs text-text-secondary flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
          <span>
            Goal: <strong>Top Notcher</strong> in the Electronics Technician Licensure Examination
          </span>
        </div>

        <button
          type="button"
          onClick={logout}
          className="w-full py-2.5 px-4 rounded-xl border border-primary/20 text-primary bg-primary/10 hover:bg-primary hover:text-white font-bold text-xs transition flex items-center justify-center gap-2 active:scale-95 shadow-xs"
        >
          <Users className="w-4 h-4" /> Switch Reviewer / Change Profile
        </button>
      </div>

      {/* Progress Reset / Danger Zone */}
      <div className="bg-card border border-danger/20 rounded-2xl p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-danger flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4" /> Reset Review Progress
        </h2>

        <p className="text-xs text-text-secondary leading-relaxed">
          Need a fresh start? Resetting your progress will clear all your completed quiz sessions, accuracy rates, and score history for your account. This action cannot be undone. Uploaded questions remain intact.
        </p>

        {resetStatus && (
          <div className="p-3 rounded-xl bg-success/10 border border-success/30 text-success text-xs font-semibold">
            {resetStatus}
          </div>
        )}

        <button
          type="button"
          disabled={resetting}
          onClick={handleResetProgress}
          className="py-2.5 px-4 rounded-xl font-bold text-xs text-danger bg-danger/10 hover:bg-danger hover:text-white border border-danger/30 transition flex items-center gap-2 disabled:opacity-50"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
          {resetting ? 'Resetting Progress...' : 'Reset My Progress'}
        </button>
      </div>
    </div>
  );
}
