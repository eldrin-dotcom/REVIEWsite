import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, RotateCcw, Zap, Sparkles, BookMarked, ArrowRight } from 'lucide-react';

export default function MistakeVaultCard() {
  const navigate = useNavigate();
  const [data, setData] = useState<{
    activeCount: number;
    clearedCount: number;
    totalEverMissed: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingDrill, setStartingDrill] = useState(false);

  useEffect(() => {
    async function fetchMistakes() {
      try {
        const res = await fetch('/api/questions/mistakes/vault', { credentials: 'include' });
        if (res.ok) {
          const json = await res.json();
          if (json.success) setData(json.data);
        }
      } catch (err) {
        console.error('Failed to load mistake vault:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchMistakes();
  }, []);

  const handleStartMistakeDrill = async () => {
    setStartingDrill(true);
    try {
      const res = await fetch('/api/quiz/start-mistakes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ count: 10 }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        // Navigate to practice page with pre-started session
        navigate('/practice', {
          state: {
            mistakeSession: json.data.session,
            mistakeQuestions: json.data.questions,
          },
        });
      } else {
        alert(json.error || 'Failed to start mistake drill');
      }
    } catch (err) {
      console.error('Error starting mistake drill:', err);
      alert('Network error starting mistake drill');
    } finally {
      setStartingDrill(false);
    }
  };

  const activeCount = data?.activeCount || 0;
  const clearedCount = data?.clearedCount || 0;

  return (
    <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
              <RotateCcw className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-base font-bold text-text-primary tracking-tight">
                Mistake Vault
              </h3>
              <span className="text-[11px] text-text-secondary">
                Smart Spaced-Repetition Drill
              </span>
            </div>
          </div>

          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
              activeCount === 0
                ? 'bg-success/10 text-success border-success/30'
                : 'bg-rose-500/10 text-rose-500 border-rose-500/30'
            }`}
          >
            {activeCount === 0 ? 'All Cleared! 🎉' : `${activeCount} to Fix`}
          </span>
        </div>

        <p className="text-xs text-text-secondary leading-relaxed mb-4">
          Every question you answer incorrectly goes here automatically. Re-test and answer them correctly to clear them from your vault!
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="p-3 rounded-2xl bg-bg-secondary border border-border">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">
              Active Mistakes
            </span>
            <span className="text-xl sm:text-2xl font-black text-rose-500">
              {activeCount}
            </span>
            <span className="text-[10px] text-text-secondary block">Needs practice</span>
          </div>

          <div className="p-3 rounded-2xl bg-bg-secondary border border-border">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">
              Mastered / Cleared
            </span>
            <span className="text-xl sm:text-2xl font-black text-success">
              {clearedCount}
            </span>
            <span className="text-[10px] text-text-secondary block">Fixed correctly</span>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <button
        type="button"
        disabled={activeCount === 0 || startingDrill}
        onClick={handleStartMistakeDrill}
        className={`w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition shadow-xs flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
          activeCount === 0
            ? 'bg-bg-secondary text-text-secondary border border-border'
            : 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20'
        }`}
      >
        {startingDrill ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Loading Mistake Drill...</span>
          </>
        ) : activeCount === 0 ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-success" />
            <span>Vault Clean! Keep Up The Good Work</span>
          </>
        ) : (
          <>
            <Zap className="w-4 h-4" />
            <span>Clear My Mistakes (10 Questions)</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </div>
  );
}
