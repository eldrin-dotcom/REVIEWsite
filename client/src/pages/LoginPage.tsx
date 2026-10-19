import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Target, User, Heart, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSelectProfile = async (username: string) => {
    setError('');
    setSelectedProfile(username);
    setLoading(true);

    try {
      await login(username);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to select profile');
      }
      setSelectedProfile(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 transition-colors duration-200">
      <div className="w-full max-w-lg">
        {/* Header Icon & Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-4 shadow-sm">
            <Target className="w-8 h-8" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight">
            REVIEW<span className="text-primary">site</span>
          </h1>
          <p className="text-text-secondary text-sm mt-1.5">
            Pre-board & Electronics Technician (ECT) Licensure Review
          </p>
          <div className="mt-2.5 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="w-3.5 h-3.5" /> Aiming for Top Notcher
          </div>
        </div>

        {/* Profile Picker Card */}
        <div className="bg-card rounded-3xl shadow-xl border border-border p-6 sm:p-8">
          <div className="text-center mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
              Who is reviewing?
            </h2>
            <p className="text-text-secondary text-xs sm:text-sm mt-1">
              Select your profile to continue your exam preparation
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Profile Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* John */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSelectProfile('john')}
              className={`group relative p-5 rounded-2xl border-2 text-left transition-all duration-200 flex flex-col justify-between items-center sm:items-start text-center sm:text-left ${
                selectedProfile === 'john' && loading
                  ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                  : 'border-border bg-bg-secondary hover:border-primary/50 hover:bg-card hover:shadow-md active:scale-95'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <User className="w-7 h-7" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-text-primary group-hover:text-primary transition-colors">
                    John
                  </h3>
                  <span className="inline-block text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                    Reviewer
                  </span>
                </div>
              </div>

              <div className="w-full mt-4 pt-3.5 border-t border-border flex items-center justify-between text-xs text-text-secondary">
                <span className="font-medium text-primary flex items-center gap-1">
                  {selectedProfile === 'john' && loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      Start Review <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </span>
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                  Top Notcher
                </span>
              </div>
            </button>

            {/* Hon */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSelectProfile('emma')}
              className={`group relative p-5 rounded-2xl border-2 text-left transition-all duration-200 flex flex-col justify-between items-center sm:items-start text-center sm:text-left ${
                selectedProfile === 'emma' && loading
                  ? 'border-rose-500 bg-rose-500/10 ring-2 ring-rose-500/30'
                  : 'border-border bg-bg-secondary hover:border-rose-500/50 hover:bg-card hover:shadow-md active:scale-95'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full">
                <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Heart className="w-7 h-7 fill-rose-500/20" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-text-primary group-hover:text-rose-500 transition-colors">
                    Hon
                  </h3>
                  <span className="inline-block text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                    Reviewer
                  </span>
                </div>
              </div>

              <div className="w-full mt-4 pt-3.5 border-t border-border flex items-center justify-between text-xs text-text-secondary">
                <span className="font-medium text-rose-500 flex items-center gap-1">
                  {selectedProfile === 'emma' && loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      Start Review <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </span>
                <span className="text-[10px] bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-full font-bold">
                  Top Notcher
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-xs text-text-secondary mt-6 flex items-center justify-center gap-1.5">
          Private study portal for John & Hon <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
        </p>
      </div>
    </div>
  );
}
