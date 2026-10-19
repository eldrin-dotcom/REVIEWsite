import React, { useState, useEffect } from 'react';
import type { ExamCountdownInfo } from 'shared';
import { Calendar, Clock, Edit2, Check, X, Sparkles, GraduationCap } from 'lucide-react';

interface ExamCountdownCardProps {
  countdownInfo: ExamCountdownInfo;
  onUpdateCountdown: (newInfo: ExamCountdownInfo) => void;
}

export default function ExamCountdownCard({ countdownInfo, onUpdateCountdown }: ExamCountdownCardProps) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [editDate, setEditDate] = useState(countdownInfo.targetDate.slice(0, 16));
  const [editTitle, setEditTitle] = useState(countdownInfo.title);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync internal state when props update
  useEffect(() => {
    setEditDate(countdownInfo.targetDate.slice(0, 16));
    setEditTitle(countdownInfo.title);
  }, [countdownInfo]);

  // Real-time ticking countdown
  useEffect(() => {
    function calculate() {
      const target = new Date(countdownInfo.targetDate).getTime();
      const now = new Date().getTime();
      const diff = Math.max(0, target - now);

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds });
    }

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [countdownInfo.targetDate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDate) return;

    setSaving(true);
    try {
      const res = await fetch('/api/progress/exam-countdown', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          targetDate: new Date(editDate).toISOString(),
          title: editTitle.trim(),
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        onUpdateCountdown(json.data);
        setIsEditing(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert(json.error || 'Failed to update countdown date');
      }
    } catch (err) {
      console.error('Failed to update countdown:', err);
      alert('Error saving new exam countdown date');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative overflow-hidden bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20 mb-1.5">
            <GraduationCap className="w-3.5 h-3.5" /> Official Exam Target
          </div>
          <h2 className="text-base sm:text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
            <span>{countdownInfo.title}</span>
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="p-1.5 rounded-lg text-text-secondary hover:text-primary hover:bg-bg-secondary transition active:scale-95"
              title="Edit target exam date"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </h2>
        </div>

        {saveSuccess && (
          <span className="text-xs font-semibold text-success flex items-center gap-1 bg-success/10 px-2.5 py-1 rounded-full border border-success/30">
            <Check className="w-3.5 h-3.5" /> Exam date saved!
          </span>
        )}
      </div>

      {/* Inline Date Edit Form */}
      {isEditing ? (
        <form onSubmit={handleSave} className="mb-4 p-4 rounded-2xl bg-bg-secondary border border-border space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">
                Exam Title
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl bg-card border border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g. ECT Licensure Exam"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">
                Target Date & Time
              </label>
              <input
                type="datetime-local"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl bg-card border border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 rounded-xl border border-border text-text-secondary hover:text-text-primary text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition flex items-center gap-1.5"
            >
              {saving ? 'Saving...' : 'Save Target Date'}
            </button>
          </div>
        </form>
      ) : null}

      {/* Countdown Timer Display Pills */}
      <div className="grid grid-cols-4 gap-2 sm:gap-4 text-center my-2">
        {/* Days */}
        <div className="p-3 sm:p-4 rounded-2xl bg-bg-secondary border border-border">
          <span className="block text-2xl sm:text-4xl font-black text-primary tracking-tight">
            {timeLeft.days}
          </span>
          <span className="text-[10px] sm:text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Days
          </span>
        </div>

        {/* Hours */}
        <div className="p-3 sm:p-4 rounded-2xl bg-bg-secondary border border-border">
          <span className="block text-2xl sm:text-4xl font-black text-text-primary tracking-tight">
            {String(timeLeft.hours).padStart(2, '0')}
          </span>
          <span className="text-[10px] sm:text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Hours
          </span>
        </div>

        {/* Minutes */}
        <div className="p-3 sm:p-4 rounded-2xl bg-bg-secondary border border-border">
          <span className="block text-2xl sm:text-4xl font-black text-text-primary tracking-tight">
            {String(timeLeft.minutes).padStart(2, '0')}
          </span>
          <span className="text-[10px] sm:text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Mins
          </span>
        </div>

        {/* Seconds */}
        <div className="p-3 sm:p-4 rounded-2xl bg-bg-secondary border border-border">
          <span className="block text-2xl sm:text-4xl font-black text-text-primary tracking-tight">
            {String(timeLeft.seconds).padStart(2, '0')}
          </span>
          <span className="text-[10px] sm:text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Secs
          </span>
        </div>
      </div>

      {/* Motivation Footer */}
      <div className="mt-4 pt-3.5 border-t border-border flex items-center justify-between text-xs text-text-secondary">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          Every question answered today secures John & Hon's Top 10 finish!
        </span>
        <span className="hidden sm:inline-block text-[11px] font-medium text-text-secondary">
          Target: {new Date(countdownInfo.targetDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>
    </div>
  );
}
