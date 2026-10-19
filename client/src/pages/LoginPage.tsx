import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Target, User, Heart, Lock, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('john');
  const [password, setPassword] = useState('changeme123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 transition-colors duration-200">
      <div className="w-full max-w-md">
        {/* Header Icon & Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-4 shadow-sm">
            <Target className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">
            REVIEW<span className="text-primary">site</span>
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Pre-board & Electronics Technician (ECT) Licensure Review
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="w-3.5 h-3.5" /> Aiming for Top Notcher
          </div>
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl shadow-xl border border-border p-6 sm:p-8">
          {/* Quick User Select */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
              Who is reviewing?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setUsername('john')}
                className={`py-2.5 px-3 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 transition ${
                  username === 'john'
                    ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                    : 'border-border bg-bg-secondary text-text-secondary hover:text-text-primary'
                }`}
              >
                <User className="w-4 h-4" /> John
              </button>
              <button
                type="button"
                onClick={() => setUsername('emma')}
                className={`py-2.5 px-3 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 transition ${
                  username === 'emma'
                    ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                    : 'border-border bg-bg-secondary text-text-secondary hover:text-text-primary'
                }`}
              >
                <Heart className="w-4 h-4 text-rose-500" /> Hon
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5"
              >
                Username
              </label>
              <div className="relative">
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-bg-secondary border border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition text-sm"
                  placeholder="Enter username"
                />
                <User className="w-4 h-4 text-text-secondary absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-bg-secondary border border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition text-sm"
                  placeholder="Enter password"
                />
                <Lock className="w-4 h-4 text-text-secondary absolute left-3.5 top-3" />
              </div>
              <p className="text-xs text-text-secondary mt-1">
                Default password: <code className="bg-bg-secondary px-1 py-0.5 rounded text-xs">changeme123</code>
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-bold text-white bg-primary hover:bg-primary-hover active:scale-[0.99] transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Logging in...</span>
                </>
              ) : (
                <>
                  <span>Start Reviewing</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Note */}
        <p className="text-center text-xs text-text-secondary mt-6 flex items-center justify-center gap-1">
          Private study portal for John & Hon <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
        </p>
      </div>
    </div>
  );
}
