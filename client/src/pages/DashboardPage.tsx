import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  BookOpen,
  Timer,
  CheckCircle2,
  BarChart3,
  TrendingUp,
  Trophy,
  ArrowRight,
  Target,
  FileQuestion,
} from 'lucide-react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { ProgressOverview, SubjectScore, ProgressHistory, RecentSession } from 'shared';

export default function DashboardPage() {
  const { user } = useAuth();
  const [overview, setOverview] = useState<ProgressOverview | null>(null);
  const [subjectScores, setSubjectScores] = useState<SubjectScore[]>([]);
  const [history, setHistory] = useState<ProgressHistory[]>([]);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const [ovRes, subRes, histRes, sessRes] = await Promise.all([
          fetch('/api/progress/overview', { credentials: 'include' }),
          fetch('/api/progress/subjects', { credentials: 'include' }),
          fetch('/api/progress/history', { credentials: 'include' }),
          fetch('/api/progress/sessions', { credentials: 'include' }),
        ]);

        if (ovRes.ok) {
          const json = await ovRes.json();
          if (json.success) setOverview(json.data);
        }
        if (subRes.ok) {
          const json = await subRes.json();
          if (json.success) setSubjectScores(json.data);
        }
        if (histRes.ok) {
          const json = await histRes.json();
          if (json.success) setHistory(json.data);
        }
        if (sessRes.ok) {
          const json = await sessRes.json();
          if (json.success) setRecentSessions(json.data);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Daily Review Tracker
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
            Mabuhay, {user?.displayName}!
          </h1>
          <p className="text-text-secondary text-sm sm:text-base mt-1">
            Keep grinding every day. Top notcher rank is earned one question at a time! 🏆
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Link
            to="/practice"
            className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl font-bold text-white bg-primary hover:bg-primary-hover transition text-center text-sm shadow-sm flex items-center justify-center gap-2"
          >
            <BookOpen className="w-4 h-4" /> Practice Topic
          </Link>
          <Link
            to="/exam"
            className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl font-bold text-text-primary bg-bg-secondary hover:bg-card border border-border transition text-center text-sm flex items-center justify-center gap-2"
          >
            <Timer className="w-4 h-4" /> Timed Exam
          </Link>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Questions */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-text-secondary mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Answered</span>
            <FileQuestion className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-text-primary">
            {overview?.totalQuestionsAnswered || 0}
          </div>
          <p className="text-xs text-text-secondary mt-1">Total items reviewed</p>
        </div>

        {/* Overall Accuracy */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-text-secondary mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Accuracy</span>
            <Target className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-primary">
            {overview?.overallAccuracy || 0}%
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Target: <span className="font-semibold text-success">≥ 90%</span>
          </p>
        </div>

        {/* Total Correct */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-text-secondary mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Correct</span>
            <CheckCircle2 className="w-4 h-4 text-success" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-success">
            {overview?.totalCorrect || 0}
          </div>
          <p className="text-xs text-text-secondary mt-1">Right answers logged</p>
        </div>

        {/* Completed Sessions */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-text-secondary mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Sessions</span>
            <Timer className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-text-primary">
            {overview?.totalSessions || 0}
          </div>
          <p className="text-xs text-text-secondary mt-1">
            {overview?.practiceSessions || 0} practice · {overview?.examSessions || 0} exams
          </p>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Competency Radar Chart */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-text-primary">Subject Competency</h2>
              <p className="text-xs text-text-secondary">Accuracy percentage across exam subjects</p>
            </div>
            <BarChart3 className="w-5 h-5 text-text-secondary" />
          </div>

          <div className="flex-1 min-h-[260px] flex items-center justify-center">
            {subjectScores.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={subjectScores}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis
                    dataKey="subjectName"
                    stroke="var(--text-secondary)"
                    tick={{ fill: 'var(--text)', fontSize: 12 }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    stroke="var(--border)"
                    tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                  />
                  <Radar
                    name="Accuracy %"
                    dataKey="accuracy"
                    stroke="var(--primary)"
                    fill="var(--primary)"
                    fillOpacity={0.4}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center p-6 text-text-secondary text-sm">
                <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                No subject scores recorded yet. Complete a practice or exam session to populate the radar chart!
              </div>
            )}
          </div>
        </div>

        {/* Score Trend Line Chart */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-text-primary">Score Trend Over Time</h2>
              <p className="text-xs text-text-secondary">Historical session accuracy curve</p>
            </div>
            <TrendingUp className="w-5 h-5 text-text-secondary" />
          </div>

          <div className="flex-1 min-h-[260px] flex items-center justify-center">
            {history.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="var(--text-secondary)"
                    tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="var(--text-secondary)"
                    tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      borderColor: 'var(--border)',
                      borderRadius: '12px',
                      color: 'var(--text)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="accuracy"
                    stroke="var(--primary)"
                    strokeWidth={3}
                    dot={{ fill: 'var(--primary)', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center p-6 text-text-secondary text-sm">
                <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
                Trend line will display your progress as you take more quizzes.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Sessions List */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Recent Quiz Sessions</h2>
            <p className="text-xs text-text-secondary">Your latest practice and mock exam runs</p>
          </div>
          <Link to="/practice" className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
            New Quiz <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentSessions.length > 0 ? (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-text-secondary text-xs uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Mode</th>
                  <th className="pb-3 font-semibold">Context / Subject</th>
                  <th className="pb-3 font-semibold">Score</th>
                  <th className="pb-3 font-semibold">Accuracy</th>
                  <th className="pb-3 font-semibold">Time</th>
                  <th className="pb-3 font-semibold text-right">Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentSessions.map((s) => (
                  <tr key={s.id} className="hover:bg-bg-secondary/50 transition">
                    <td className="py-3 font-medium text-text-primary">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          s.mode === 'exam'
                            ? 'bg-danger/10 text-danger border border-danger/20'
                            : 'bg-primary/10 text-primary border border-primary/20'
                        }`}
                      >
                        {s.mode === 'exam' ? <Timer className="w-3 h-3" /> : <BookOpen className="w-3 h-3" />}
                        {s.mode === 'exam' ? 'Exam' : 'Practice'}
                      </span>
                    </td>
                    <td className="py-3 text-text-primary">
                      <div>
                        <span className="font-semibold">{s.subjectName || s.examTypeName}</span>
                        {s.topicName && (
                          <span className="block text-xs text-text-secondary">{s.topicName}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 font-semibold text-text-primary">
                      {s.score} / {s.totalQuestions}
                    </td>
                    <td className="py-3 font-bold">
                      <span
                        className={
                          s.accuracy >= 90
                            ? 'text-success'
                            : s.accuracy >= 70
                            ? 'text-primary'
                            : 'text-danger'
                        }
                      >
                        {s.accuracy}%
                      </span>
                    </td>
                    <td className="py-3 text-xs text-text-secondary">
                      {s.timeSpentSeconds ? `${Math.floor(s.timeSpentSeconds / 60)}m ${s.timeSpentSeconds % 60}s` : 'Untimed'}
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        to={`/review/${s.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 transition"
                      >
                        Review <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-text-secondary text-sm">
            No quiz sessions yet. Start your first practice session!
          </div>
        )}
      </div>
    </div>
  );
}
