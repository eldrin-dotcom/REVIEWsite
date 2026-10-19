import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import MathRenderer from '../components/math/MathRenderer';
import DoodleScratchpad from '../components/quiz/DoodleScratchpad';
import {
  BookOpen,
  Zap,
  GraduationCap,
  CheckCircle2,
  XCircle,
  Lightbulb,
  ArrowRight,
  Shuffle,
  Calculator,
  AlertCircle,
  Trophy,
  PenTool,
  Star,
} from 'lucide-react';
import type { ExamTypeWithSubjects, QuizQuestion, QuizSession, QuestionTypeFilter } from 'shared';

export default function PracticePage() {
  const navigate = useNavigate();

  // Hierarchy Data
  const [hierarchy, setHierarchy] = useState<ExamTypeWithSubjects[]>([]);
  const [loadingHierarchy, setLoadingHierarchy] = useState(true);

  // Configuration State
  const [selectedExamTypeId, setSelectedExamTypeId] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [questionTypeFilter, setQuestionTypeFilter] = useState<QuestionTypeFilter>('mix');
  const [itemCount, setItemCount] = useState<number>(10);

  // Active Quiz State
  const [activeSession, setActiveSession] = useState<QuizSession | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<{
    correct: boolean;
    correctAnswer: number;
    explanation?: string;
  } | null>(null);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [sessionScore, setSessionScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [startingQuiz, setStartingQuiz] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showScratchpad, setShowScratchpad] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());
  const [excludeAnswered, setExcludeAnswered] = useState(false);

  const location = useLocation();

  // Check if routed directly from Mistake Vault
  useEffect(() => {
    if (location.state?.mistakeSession && location.state?.mistakeQuestions) {
      setActiveSession(location.state.mistakeSession);
      setQuestions(location.state.mistakeQuestions);
      setCurrentIndex(0);
      setSelectedChoice(null);
      setAnswerResult(null);
      setSessionScore(0);
      setQuizFinished(false);
    }
  }, [location.state]);

  // Load bookmarked question IDs
  useEffect(() => {
    fetch('/api/questions/bookmarked-ids', { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => {
        if (j.success && Array.isArray(j.data)) {
          setBookmarkedIds(new Set(j.data));
        }
      })
      .catch((err) => console.error('Failed to load bookmarks:', err));
  }, []);

  const handleToggleBookmark = async (qId: number) => {
    try {
      const res = await fetch(`/api/questions/${qId}/bookmark`, {
        method: 'POST',
        credentials: 'include',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setBookmarkedIds((prev) => {
          const next = new Set(prev);
          if (json.bookmarked) next.add(qId);
          else next.delete(qId);
          return next;
        });
      }
    } catch (err) {
      console.error('Bookmark toggle failed:', err);
    }
  };

  // Load questions hierarchy (includes updated answeredCount)
  const fetchHierarchy = async () => {
    try {
      const res = await fetch('/api/questions/hierarchy', { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setHierarchy(json.data);
          if (json.data.length > 0) {
            setSelectedExamTypeId((prev) => prev || json.data[0].id);
            const firstEt = json.data[0];
            if (firstEt.subjects.length > 0) {
              setSelectedSubjectId((prev) => prev || firstEt.subjects[0].id);
              if (firstEt.subjects[0].topics.length > 0) {
                setSelectedTopicId((prev) => prev || firstEt.subjects[0].topics[0].id);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to load question hierarchy:', err);
    } finally {
      setLoadingHierarchy(false);
    }
  };

  useEffect(() => {
    fetchHierarchy();
  }, []);

  const handleExamTypeChange = (etId: number) => {
    setSelectedExamTypeId(etId);
    const et = hierarchy.find((e) => e.id === etId);
    if (et && et.subjects.length > 0) {
      setSelectedSubjectId(et.subjects[0].id);
      if (et.subjects[0].topics.length > 0) {
        setSelectedTopicId(et.subjects[0].topics[0].id);
      } else {
        setSelectedTopicId(null);
      }
    } else {
      setSelectedSubjectId(null);
      setSelectedTopicId(null);
    }
  };

  const handleSubjectChange = (subId: number) => {
    setSelectedSubjectId(subId);
    const et = hierarchy.find((e) => e.id === selectedExamTypeId);
    const sub = et?.subjects.find((s) => s.id === subId);
    if (sub && sub.topics.length > 0) {
      setSelectedTopicId(sub.topics[0].id);
    } else {
      setSelectedTopicId(null);
    }
  };

  const handleStartPractice = async () => {
    if (!selectedExamTypeId || !selectedSubjectId || !selectedTopicId) {
      setErrorMessage('Please select an Exam, Subject, and Topic');
      return;
    }

    setErrorMessage('');
    setStartingQuiz(true);

    try {
      const res = await fetch('/api/quiz/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          mode: 'practice',
          examTypeId: selectedExamTypeId,
          subjectId: selectedSubjectId,
          topicId: selectedTopicId,
          questionType: questionTypeFilter,
          count: itemCount,
          excludeAnswered,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to start quiz');
      }

      setActiveSession(json.data.session);
      setQuestions(json.data.questions);
      setCurrentIndex(0);
      setSelectedChoice(null);
      setAnswerResult(null);
      setSessionScore(0);
      setQuizFinished(false);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to start quiz');
      }
    } finally {
      setStartingQuiz(false);
    }
  };

  const handleSelectChoice = async (choiceIndex: number) => {
    if (answerResult || submittingAnswer || !activeSession) return;

    setSelectedChoice(choiceIndex);
    setSubmittingAnswer(true);

    const currentQ = questions[currentIndex];

    try {
      const res = await fetch(`/api/quiz/${activeSession.id}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          questionId: currentQ.id,
          selectedAnswer: choiceIndex,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setAnswerResult(json.data);
        if (json.data.correct) {
          setSessionScore((prev) => prev + 1);
        }
      }
    } catch (err) {
      console.error('Answer submission error:', err);
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleNext = async () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedChoice(null);
      setAnswerResult(null);
    } else {
      if (activeSession) {
        try {
          await fetch(`/api/quiz/${activeSession.id}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ answers: [] }),
          });
        } catch (err) {
          console.error('Finish quiz error:', err);
        }
      }
      setQuizFinished(true);
    }
  };

  const currentExam = hierarchy.find((e) => e.id === selectedExamTypeId);
  const currentSubject = currentExam?.subjects.find((s) => s.id === selectedSubjectId);
  const currentTopic = currentSubject?.topics.find((t) => t.id === selectedTopicId);

  // RENDER: Configuration Screen
  if (!activeSession || quizFinished) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        {quizFinished && (
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 text-center shadow-md animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 mx-auto flex items-center justify-center mb-3">
              <Trophy className="w-8 h-8" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
              Practice Session Completed!
            </h2>
            <p className="text-text-secondary text-sm mt-1">
              {currentSubject?.name} · {currentTopic?.name}
            </p>

            <div className="my-6 inline-flex flex-col items-center justify-center p-6 rounded-2xl bg-bg-secondary border border-border min-w-[200px]">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                Final Score
              </span>
              <span className="text-4xl sm:text-5xl font-extrabold text-primary">
                {sessionScore} <span className="text-2xl text-text-secondary">/ {questions.length}</span>
              </span>
              <span
                className={`mt-2 text-sm font-bold ${
                  sessionScore / questions.length >= 0.9
                    ? 'text-success'
                    : sessionScore / questions.length >= 0.7
                    ? 'text-primary'
                    : 'text-danger'
                }`}
              >
                {Math.round((sessionScore / questions.length) * 100)}% Accuracy
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setActiveSession(null);
                  setQuizFinished(false);
                  fetchHierarchy();
                }}
                className="w-full sm:w-auto py-2.5 px-6 rounded-xl font-bold text-white bg-primary hover:bg-primary-hover transition text-sm shadow-sm"
              >
                Practice Another Topic
              </button>
              {activeSession && (
                <button
                  type="button"
                  onClick={() => navigate(`/review/${activeSession.id}`)}
                  className="w-full sm:w-auto py-2.5 px-6 rounded-xl font-bold text-text-primary bg-bg-secondary hover:bg-card border border-border transition text-sm flex items-center justify-center gap-1.5"
                >
                  Review Answers & Explanations <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Practice Setup Header */}
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xs">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 mb-3">
            <BookOpen className="w-3.5 h-3.5" /> Untimed Mastery Mode
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
            Practice Drill
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Pick a specific subject and topic. Answer questions with instant step-by-step solutions!
          </p>

          {errorMessage && (
            <div className="mt-4 p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <div className="mt-6 space-y-5">
            {/* 1. Exam Context */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                1. Select Exam Context
              </label>
              <div className="grid grid-cols-2 gap-3">
                {hierarchy.map((et) => (
                  <button
                    key={et.id}
                    type="button"
                    onClick={() => handleExamTypeChange(et.id)}
                    className={`p-3.5 rounded-xl border text-left transition ${
                      selectedExamTypeId === et.id
                        ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                        : 'border-border bg-bg-secondary text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <span className="text-base flex items-center gap-1.5 font-bold mb-0.5">
                      {et.name === 'ECT' ? <Zap className="w-4 h-4 text-amber-500" /> : <GraduationCap className="w-4 h-4 text-primary" />}
                      {et.name}
                    </span>
                    <span className="text-xs font-normal opacity-80 block truncate">
                      {et.name === 'ECT' ? 'Basic Math, Electronics, ESAT, Laws' : 'Math, GEAS, Electronics, ESAT'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Subject */}
            {currentExam && (
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                  2. Select Subject
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {currentExam.subjects.map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => handleSubjectChange(sub.id)}
                      className={`py-2.5 px-3 rounded-xl border text-center text-sm font-semibold transition ${
                        selectedSubjectId === sub.id
                          ? 'border-primary bg-primary/10 text-primary shadow-xs'
                          : 'border-border bg-bg-secondary text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {sub.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Topic */}
            {currentSubject && (
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                  3. Select Topic
                </label>
                {currentSubject.topics.length > 0 ? (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {currentSubject.topics.map((t) => {
                      const answered = t.answeredCount || 0;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setSelectedTopicId(t.id)}
                          className={`w-full p-3 rounded-xl border text-left flex items-center justify-between text-sm transition ${
                            selectedTopicId === t.id
                              ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                              : 'border-border bg-bg-secondary text-text-primary hover:border-primary/50'
                          }`}
                        >
                          <span className="truncate pr-2">{t.name}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {answered > 0 && (
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                {answered} done
                              </span>
                            )}
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-bg-secondary border border-border text-text-secondary whitespace-nowrap">
                              {t.questionCount} {t.questionCount === 1 ? 'item' : 'items'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-bg-secondary border border-border text-center text-text-secondary text-sm">
                    No topics uploaded for this subject yet.{' '}
                    <button
                      type="button"
                      onClick={() => navigate('/upload')}
                      className="text-primary font-semibold underline ml-1"
                    >
                      Upload questions →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 4. Filter by Conceptual vs Computation vs Mixed */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                4. Question Type Filter
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setQuestionTypeFilter('mix')}
                  className={`py-2 px-3 rounded-xl border text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-1.5 ${
                    questionTypeFilter === 'mix'
                      ? 'border-primary bg-primary text-white shadow-xs'
                      : 'border-border bg-bg-secondary text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Shuffle className="w-3.5 h-3.5" /> Mixed (All)
                </button>
                <button
                  type="button"
                  onClick={() => setQuestionTypeFilter('conceptual')}
                  className={`py-2 px-3 rounded-xl border text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-1.5 ${
                    questionTypeFilter === 'conceptual'
                      ? 'border-primary bg-primary text-white shadow-xs'
                      : 'border-border bg-bg-secondary text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" /> Conceptual
                </button>
                <button
                  type="button"
                  onClick={() => setQuestionTypeFilter('computation')}
                  className={`py-2 px-3 rounded-xl border text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-1.5 ${
                    questionTypeFilter === 'computation'
                      ? 'border-primary bg-primary text-white shadow-xs'
                      : 'border-border bg-bg-secondary text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Calculator className="w-3.5 h-3.5" /> Computation
                </button>
              </div>
            </div>

            {/* 5. Item Count */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                5. Number of Questions
              </label>
              <div className="flex items-center gap-2">
                {[5, 10, 20, 30, 50].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setItemCount(num)}
                    className={`py-2 px-4 rounded-xl border text-xs sm:text-sm font-semibold transition ${
                      itemCount === num
                        ? 'border-primary bg-primary/10 text-primary shadow-xs'
                        : 'border-border bg-bg-secondary text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* 6. Option to Exclude Already Answered Questions */}
            {currentTopic && (
              <div className="pt-1">
                <label
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition cursor-pointer select-none ${
                    excludeAnswered
                      ? 'border-primary/50 bg-primary/5 shadow-xs'
                      : 'border-border bg-bg-secondary hover:bg-card/70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition ${
                        excludeAnswered
                          ? 'bg-primary text-white shadow-xs'
                          : 'bg-bg-secondary text-text-secondary border border-border'
                      }`}
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-text-primary flex items-center gap-2">
                        <span>Exclude already answered questions</span>
                        {currentTopic.answeredCount !== undefined && currentTopic.answeredCount > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                            {Math.max(0, currentTopic.questionCount - currentTopic.answeredCount)} new left
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-text-secondary mt-0.5">
                        {currentTopic.answeredCount !== undefined &&
                        currentTopic.answeredCount >= currentTopic.questionCount
                          ? 'All questions in this topic have been answered. Keep unchecked to review again.'
                          : 'Drill only fresh questions you haven\'t answered yet.'}
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={excludeAnswered}
                    onChange={(e) => setExcludeAnswered(e.target.checked)}
                    className="w-5 h-5 accent-primary rounded cursor-pointer shrink-0 ml-3"
                  />
                </label>
              </div>
            )}

            {/* Start Button */}
            <button
              type="button"
              disabled={startingQuiz || !selectedTopicId}
              onClick={handleStartPractice}
              className="w-full py-3.5 px-6 rounded-xl font-bold text-white bg-primary hover:bg-primary-hover active:scale-[0.99] transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base mt-4"
            >
              {startingQuiz ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Loading Questions...</span>
                </>
              ) : (
                <>
                  <span>Start Practice Drill</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // RENDER: Active Quiz Card
  const currentQ = questions[currentIndex];
  const choiceLabels = ['A', 'B', 'C', 'D'];

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Quiz Progress Header */}
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-xs">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary block">
            {currentSubject?.name} · {currentTopic?.name}
          </span>
          <span className="text-base sm:text-lg font-bold text-text-primary">
            Question {currentIndex + 1} of {questions.length}
          </span>
        </div>

        {/* Tools (Scratchpad & Formulas), Live Score Counter & Quit */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setShowScratchpad((prev) => !prev)}
            className={`py-1.5 px-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 active:scale-95 ${
              showScratchpad
                ? 'bg-primary text-white border-primary shadow-xs'
                : 'bg-bg-secondary hover:bg-card border-border text-text-primary'
            }`}
            title="Open doodle scratchpad for calculations"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Scratchpad</span>
          </button>

          <div className="text-right pl-1 border-l border-border">
            <span className="text-[10px] font-semibold text-text-secondary block">Score</span>
            <span className="text-base sm:text-lg font-extrabold text-primary">
              {sessionScore} <span className="text-xs font-normal text-text-secondary">correct</span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              if (confirm('Are you sure you want to exit this practice drill?')) {
                setActiveSession(null);
                fetchHierarchy();
              }
            }}
            className="text-xs text-text-secondary hover:text-danger px-2.5 py-1.5 rounded-lg border border-border hover:bg-bg-secondary transition"
          >
            Quit
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-bg-secondary h-2 rounded-full overflow-hidden border border-border">
        <div
          className="bg-primary h-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question Card */}
      <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
        {/* Type Badge & Star Bookmark */}
        <div className="mb-4 flex items-center justify-between">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              currentQ.type === 'computation'
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                : 'bg-primary/10 text-primary border border-primary/20'
            }`}
          >
            {currentQ.type === 'computation' ? <Calculator className="w-3 h-3" /> : <BookOpen className="w-3 h-3" />}
            {currentQ.type === 'computation' ? 'Computation' : 'Conceptual'}
          </span>

          <button
            type="button"
            onClick={() => handleToggleBookmark(currentQ.id)}
            className={`px-2.5 py-1 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 ${
              bookmarkedIds.has(currentQ.id)
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-500 font-bold'
                : 'bg-bg-secondary border-border text-text-secondary hover:text-text-primary'
            }`}
            title={bookmarkedIds.has(currentQ.id) ? 'Starred question' : 'Star this question'}
          >
            <Star className={`w-3.5 h-3.5 ${bookmarkedIds.has(currentQ.id) ? 'fill-amber-500 text-amber-500' : ''}`} />
            <span>{bookmarkedIds.has(currentQ.id) ? 'Starred' : 'Star'}</span>
          </button>
        </div>

        {/* Question Text */}
        <div className="text-base sm:text-lg font-medium text-text-primary leading-relaxed mb-6">
          <MathRenderer content={currentQ.text} />
        </div>

        {/* Choices */}
        <div className="space-y-3">
          {currentQ.choices.map((choice, idx) => {
            let choiceStyle =
              'border-border bg-bg-secondary hover:bg-card hover:border-primary/50 text-text-primary';

            if (answerResult) {
              if (idx === answerResult.correctAnswer) {
                choiceStyle =
                  'border-success bg-success/15 text-success font-semibold shadow-xs';
              } else if (idx === selectedChoice && !answerResult.correct) {
                choiceStyle =
                  'border-danger bg-danger/15 text-danger font-semibold shadow-xs';
              } else {
                choiceStyle = 'border-border bg-bg-secondary/40 text-text-secondary opacity-60';
              }
            } else if (selectedChoice === idx) {
              choiceStyle = 'border-primary bg-primary/10 text-primary font-bold';
            }

            return (
              <button
                key={idx}
                type="button"
                disabled={Boolean(answerResult) || submittingAnswer}
                onClick={() => handleSelectChoice(idx)}
                className={`w-full p-4 rounded-xl border text-left flex items-start gap-3.5 transition active:scale-[0.99] ${choiceStyle}`}
              >
                <span
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                    answerResult && idx === answerResult.correctAnswer
                      ? 'bg-success text-white'
                      : answerResult && idx === selectedChoice && !answerResult.correct
                      ? 'bg-danger text-white'
                      : 'bg-card border border-border text-text-secondary'
                  }`}
                >
                  {choiceLabels[idx] || idx + 1}
                </span>
                <span className="flex-1 text-sm sm:text-base leading-snug">
                  <MathRenderer content={choice} />
                </span>
              </button>
            );
          })}
        </div>

        {/* Instant Feedback & Step-by-Step Solution / Explanation */}
        {answerResult && (
          <div className="mt-6 pt-6 border-t border-border animate-fade-in space-y-4">
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 ${
                answerResult.correct
                  ? 'bg-success/10 border-success/30 text-success'
                  : 'bg-danger/10 border-danger/30 text-danger'
              }`}
            >
              {answerResult.correct ? (
                <CheckCircle2 className="w-6 h-6 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-6 h-6 shrink-0 mt-0.5" />
              )}
              <div>
                <h4 className="font-bold text-base">
                  {answerResult.correct ? 'Correct Answer!' : 'Incorrect'}
                </h4>
                <p className="text-xs sm:text-sm mt-0.5 opacity-90">
                  {answerResult.correct
                    ? 'Excellent job! Keep the momentum going.'
                    : `Correct choice is (${choiceLabels[answerResult.correctAnswer]})`}
                </p>
              </div>
            </div>

            {/* Explanation with Math */}
            {answerResult.explanation && (
              <div className="bg-bg-secondary border border-border rounded-xl p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-2 text-xs font-bold text-text-secondary uppercase tracking-wider">
                  <Lightbulb className="w-4 h-4 text-amber-500" /> Step-by-step Solution & Explanation
                </div>
                <div className="text-sm sm:text-base text-text-primary leading-relaxed">
                  <MathRenderer content={answerResult.explanation} />
                </div>
              </div>
            )}

            {/* Next Button */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleNext}
                className="py-3 px-8 rounded-xl font-bold text-white bg-primary hover:bg-primary-hover active:scale-[0.99] transition shadow-md text-sm sm:text-base flex items-center gap-2"
              >
                <span>{currentIndex + 1 < questions.length ? 'Next Question' : 'Complete Drill'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Interactive Computation Scratchpad */}
      <DoodleScratchpad
        isOpen={showScratchpad}
        onClose={() => setShowScratchpad(false)}
      />
    </div>
  );
}
