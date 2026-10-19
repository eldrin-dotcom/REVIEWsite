import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import MathRenderer from '../components/math/MathRenderer';
import {
  CheckCircle2,
  XCircle,
  ClipboardCheck,
  Lightbulb,
  ArrowLeft,
  Timer,
  BookOpen,
} from 'lucide-react';
import type { QuizReview } from 'shared';

export default function ReviewPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [review, setReview] = useState<QuizReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'mistakes' | 'correct'>('all');

  useEffect(() => {
    async function fetchReview() {
      try {
        const res = await fetch(`/api/quiz/${sessionId}/review`, { credentials: 'include' });
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setReview(json.data);
          }
        }
      } catch (err) {
        console.error('Failed to load review:', err);
      } finally {
        setLoading(false);
      }
    }

    if (sessionId) {
      fetchReview();
    }
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!review) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold text-text-primary">Review session not found</h2>
        <Link to="/" className="text-primary mt-2 inline-flex items-center gap-1 font-semibold">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>
    );
  }

  const { session, items } = review;
  const choiceLabels = ['A', 'B', 'C', 'D'];
  const accuracy = session.totalQuestions > 0 ? Math.round((session.correctAnswers / session.totalQuestions) * 100) : 0;

  const filteredItems = items.filter((item) => {
    if (filter === 'mistakes') return !item.isCorrect;
    if (filter === 'correct') return item.isCorrect;
    return true;
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Review Header Banner */}
      <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 mb-2">
              <ClipboardCheck className="w-3.5 h-3.5" /> Quiz Review & Solutions
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
              Session Performance
            </h1>
            <p className="text-text-secondary text-xs sm:text-sm mt-1 flex items-center gap-1.5">
              {session.mode === 'exam' ? <Timer className="w-3.5 h-3.5 text-danger" /> : <BookOpen className="w-3.5 h-3.5 text-primary" />}
              <span>{session.mode === 'exam' ? 'Timed Mock Exam' : 'Practice Drill'}</span>
              <span>· Completed on {session.completedAt ? new Date(session.completedAt).toLocaleString() : 'N/A'}</span>
            </p>
          </div>

          <div className="text-right bg-bg-secondary p-4 rounded-xl border border-border min-w-[130px]">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
              Score
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-primary block">
              {session.correctAnswers} / {session.totalQuestions}
            </span>
            <span
              className={`text-xs font-bold ${
                accuracy >= 90 ? 'text-success' : accuracy >= 70 ? 'text-primary' : 'text-danger'
              }`}
            >
              {accuracy}% Accuracy
            </span>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 mt-6 pt-6 border-t border-border">
          <span className="text-xs font-semibold text-text-secondary mr-2">Show:</span>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === 'all'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
            }`}
          >
            All Questions ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('mistakes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
              filter === 'mistakes'
                ? 'bg-danger text-white shadow-xs'
                : 'bg-bg-secondary text-text-secondary hover:text-danger'
            }`}
          >
            <XCircle className="w-3 h-3" /> Mistakes Only ({items.filter((i) => !i.isCorrect).length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('correct')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
              filter === 'correct'
                ? 'bg-success text-white shadow-xs'
                : 'bg-bg-secondary text-text-secondary hover:text-success'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" /> Correct ({items.filter((i) => i.isCorrect).length})
          </button>
        </div>
      </div>

      {/* Questions Review List */}
      <div className="space-y-4">
        {filteredItems.map((item, index) => {
          const { question, selectedAnswer, isCorrect } = item;

          return (
            <div
              key={question.id}
              className={`bg-card border rounded-2xl p-6 shadow-xs transition ${
                isCorrect ? 'border-border' : 'border-danger/40 ring-1 ring-danger/10'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-text-secondary">
                  Item #{index + 1}
                </span>

                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    isCorrect
                      ? 'bg-success/10 text-success border border-success/20'
                      : 'bg-danger/10 text-danger border border-danger/20'
                  }`}
                >
                  {isCorrect ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5" /> {selectedAnswer === null ? 'Unanswered' : 'Incorrect'}
                    </>
                  )}
                </span>
              </div>

              {/* Question Text with KaTeX */}
              <div className="text-base font-medium text-text-primary leading-relaxed mb-4">
                <MathRenderer content={question.text} />
              </div>

              {/* Choices list */}
              <div className="space-y-2 mb-4">
                {question.choices.map((choice, cIdx) => {
                  const isUserSelection = selectedAnswer === cIdx;
                  const isCorrectChoice = question.correctAnswer === cIdx;

                  let style = 'bg-bg-secondary border-border text-text-primary';
                  if (isCorrectChoice) {
                    style = 'bg-success/15 border-success text-success font-semibold';
                  } else if (isUserSelection && !isCorrect) {
                    style = 'bg-danger/15 border-danger text-danger font-semibold';
                  }

                  return (
                    <div
                      key={cIdx}
                      className={`p-3 rounded-xl border text-sm flex items-start gap-3 ${style}`}
                    >
                      <span
                        className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                          isCorrectChoice
                            ? 'bg-success text-white'
                            : isUserSelection && !isCorrect
                            ? 'bg-danger text-white'
                            : 'bg-card border border-border text-text-secondary'
                        }`}
                      >
                        {choiceLabels[cIdx] || cIdx + 1}
                      </span>
                      <span className="flex-1">
                        <MathRenderer content={choice} />
                      </span>
                      {isCorrectChoice && (
                        <span className="text-xs font-bold text-success ml-auto">Correct Answer</span>
                      )}
                      {isUserSelection && !isCorrectChoice && (
                        <span className="text-xs font-bold text-danger ml-auto">Your Choice</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Explanation & Solution */}
              {question.explanation && (
                <div className="bg-bg-secondary border border-border rounded-xl p-4 text-sm mt-3">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-text-secondary uppercase tracking-wider mb-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> Solution & Explanation:
                  </div>
                  <div className="text-text-primary leading-relaxed">
                    <MathRenderer content={question.explanation} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="text-center pt-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 py-2.5 px-6 rounded-xl font-bold text-white bg-primary hover:bg-primary-hover transition text-sm shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
