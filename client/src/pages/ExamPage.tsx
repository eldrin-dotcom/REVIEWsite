import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MathRenderer from '../components/math/MathRenderer';
import DoodleScratchpad from '../components/quiz/DoodleScratchpad';
import FormulaSheetModal from '../components/quiz/FormulaSheetModal';
import {
  Timer,
  Zap,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Clock,
  PenTool,
  BookOpen,
  Star,
} from 'lucide-react';
import type { ExamTypeWithSubjects, QuizQuestion, QuizSession } from 'shared';

export default function ExamPage() {
  const navigate = useNavigate();

  // Hierarchy
  const [hierarchy, setHierarchy] = useState<ExamTypeWithSubjects[]>([]);
  const [loading, setLoading] = useState(true);

  // Exam Config
  const [selectedExamTypeId, setSelectedExamTypeId] = useState<number | null>(null);
  const [itemCount, setItemCount] = useState<number>(50);
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [startingExam, setStartingExam] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Active Exam State
  const [activeSession, setActiveSession] = useState<QuizSession | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<number, number>>(new Map());
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [submittingExam, setSubmittingExam] = useState(false);
  const [showScratchpad, setShowScratchpad] = useState(false);
  const [showFormulaSheet, setShowFormulaSheet] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());

  const timerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Load exam types
  useEffect(() => {
    async function fetchHierarchy() {
      try {
        const res = await fetch('/api/questions/hierarchy', { credentials: 'include' });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data?.length > 0) {
            setHierarchy(json.data);
            setSelectedExamTypeId(json.data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load hierarchy:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchHierarchy();
  }, []);

  // Countdown Timer
  useEffect(() => {
    if (!activeSession || secondsRemaining <= 0) return;

    timerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeSession]);

  const handleStartExam = async () => {
    if (!selectedExamTypeId) {
      setErrorMessage('Please select an exam context');
      return;
    }

    if (durationMinutes <= 0) {
      setErrorMessage('Please set a valid duration in minutes');
      return;
    }

    setErrorMessage('');
    setStartingExam(true);

    try {
      const res = await fetch('/api/quiz/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          mode: 'exam',
          examTypeId: selectedExamTypeId,
          questionType: 'mix',
          count: itemCount,
          timeLimitSeconds: durationMinutes * 60,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to start exam');
      }

      setActiveSession(json.data.session);
      setQuestions(json.data.questions);
      setSecondsRemaining(durationMinutes * 60);
      setCurrentIndex(0);
      setAnswers(new Map());
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to start exam');
      }
    } finally {
      setStartingExam(false);
    }
  };

  const handleSelectChoice = (choiceIndex: number) => {
    const q = questions[currentIndex];
    setAnswers((prev) => {
      const updated = new Map(prev);
      updated.set(q.id, choiceIndex);
      return updated;
    });
  };

  const handleSubmitExam = async (isAuto = false) => {
    if (!activeSession || submittingExam) return;

    if (!isAuto) {
      const unanswered = questions.length - answers.size;
      const confirmText =
        unanswered > 0
          ? `You still have ${unanswered} unanswered question(s). Are you sure you want to submit your exam?`
          : 'Are you sure you want to finish and submit your exam?';

      if (!confirm(confirmText)) return;
    }

    setSubmittingExam(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const formattedAnswers = Array.from(answers.entries()).map(([questionId, selectedAnswer]) => ({
      questionId,
      selectedAnswer,
    }));

    try {
      const res = await fetch(`/api/quiz/${activeSession.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ answers: formattedAnswers }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        navigate(`/review/${activeSession.id}`);
      } else {
        alert(json.error || 'Failed to submit exam');
      }
    } catch (err) {
      console.error('Submit exam error:', err);
      alert('Error submitting exam. Please check connection.');
    } finally {
      setSubmittingExam(false);
    }
  };

  const handleAutoSubmit = () => {
    alert('Time has expired! Your exam is being automatically submitted.');
    handleSubmitExam(true);
  };

  const formatTime = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = secs % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');
    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  const choiceLabels = ['A', 'B', 'C', 'D'];

  // RENDER: Exam Configuration Screen
  if (!activeSession) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xs">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-danger/10 text-danger border border-danger/20 mb-3">
            <Timer className="w-3.5 h-3.5" /> Timed Mock Exam Mode
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
            Board Exam Simulation
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Simulate actual licensure conditions with mixed questions from all subjects and a countdown timer.
          </p>

          {errorMessage && (
            <div className="mt-4 p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="mt-6 space-y-5">
            {/* 1. Exam Context */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                1. Select Exam Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                {hierarchy.map((et) => (
                  <button
                    key={et.id}
                    type="button"
                    onClick={() => setSelectedExamTypeId(et.id)}
                    className={`p-4 rounded-xl border text-left transition ${
                      selectedExamTypeId === et.id
                        ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                        : 'border-border bg-bg-secondary text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <span className="text-base flex items-center gap-1.5 font-bold mb-1">
                      {et.name === 'ECT' ? <Zap className="w-4 h-4 text-amber-500" /> : <GraduationCap className="w-4 h-4 text-primary" />}
                      {et.name}
                    </span>
                    <span className="text-xs font-normal opacity-80 block">
                      {et.name === 'ECT'
                        ? 'Mix of Basic Math, Electronics, ESAT, ECE Laws'
                        : 'Mix of Math, GEAS, Electronics, ESAT'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Number of Items */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                2. Number of Questions
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[25, 50, 75, 100].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setItemCount(num)}
                    className={`py-2.5 px-3 rounded-xl border text-sm font-semibold transition ${
                      itemCount === num
                        ? 'border-primary bg-primary/10 text-primary shadow-xs'
                        : 'border-border bg-bg-secondary text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {num} Items
                  </button>
                ))}
              </div>
            </div>

            {/* 3. User-Configured Time Limit */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  3. Set Time Limit (Minutes)
                </label>
                <span className="text-xs font-bold text-primary flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {durationMinutes} minutes ({Math.floor(durationMinutes / 60)}h {durationMinutes % 60}m)
                </span>
              </div>

              {/* Quick Preset Buttons */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[30, 60, 90, 120].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDurationMinutes(mins)}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                      durationMinutes === mins
                        ? 'border-primary bg-primary text-white shadow-xs'
                        : 'border-border bg-bg-secondary text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {mins} mins
                  </button>
                ))}
              </div>

              {/* Slider for custom minute control */}
              <input
                type="range"
                min="10"
                max="240"
                step="5"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10))}
                className="w-full accent-primary cursor-pointer"
              />
              <div className="flex justify-between text-xs text-text-secondary mt-1">
                <span>10 mins (Speed drill)</span>
                <span>240 mins (4 hours)</span>
              </div>
            </div>

            {/* Start Button */}
            <button
              type="button"
              disabled={startingExam || !selectedExamTypeId}
              onClick={handleStartExam}
              className="w-full py-3.5 px-6 rounded-xl font-bold text-white bg-primary hover:bg-primary-hover active:scale-[0.99] transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base mt-4"
            >
              {startingExam ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Preparing Examination...</span>
                </>
              ) : (
                <>
                  <Timer className="w-5 h-5" />
                  <span>Begin Examination</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // RENDER: Active Exam View
  const currentQ = questions[currentIndex];
  const answeredCount = answers.size;
  const isTimeLow = secondsRemaining < 300;

  return (
    <div className="space-y-5">
      {/* Exam Header: Question Count & Countdown Timer */}
      <div className="bg-card border border-border rounded-2xl p-3 sm:p-5 flex items-center justify-between gap-2 shadow-sm sticky top-16 z-30 backdrop-blur-md bg-opacity-95">
        <div className="min-w-0">
          <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-text-secondary block truncate">
            Mock Exam
          </span>
          <span className="text-sm sm:text-lg font-bold text-text-primary whitespace-nowrap">
            Q{currentIndex + 1} <span className="text-xs font-normal text-text-secondary">/ {questions.length}</span>
          </span>
        </div>

        {/* Tools (Scratchpad & Formulas), Timer Box & Action */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowScratchpad((prev) => !prev)}
            className={`py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 active:scale-95 ${
              showScratchpad
                ? 'bg-primary text-white border-primary shadow-xs'
                : 'bg-bg-secondary hover:bg-card border-border text-text-primary'
            }`}
            title="Open doodle scratchpad for calculations"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Scratchpad</span>
          </button>

          <button
            type="button"
            onClick={() => setShowFormulaSheet(true)}
            className="py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl border border-border bg-bg-secondary hover:bg-card text-text-primary text-xs font-bold transition flex items-center gap-1.5 active:scale-95"
            title="View electronics formulas & resistor color codes"
          >
            <BookOpen className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">Formulas</span>
          </button>

          <div
            className={`px-2 sm:px-3.5 py-1.5 sm:py-2 rounded-xl border font-mono font-bold text-xs sm:text-base flex items-center gap-1 sm:gap-1.5 transition ${
              isTimeLow
                ? 'bg-danger/15 border-danger text-danger animate-pulse'
                : 'bg-bg-secondary border-border text-text-primary'
            }`}
          >
            <Timer className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isTimeLow ? 'text-danger' : 'text-primary'}`} />
            <span>{formatTime(secondsRemaining)}</span>
          </div>

          <button
            type="button"
            onClick={() => handleSubmitExam(false)}
            disabled={submittingExam}
            className="py-1.5 sm:py-2 px-3 sm:px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-success hover:opacity-90 active:scale-95 transition shadow-sm whitespace-nowrap flex items-center gap-1"
          >
            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Submit</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Main Question Card */}
        <div className="lg:col-span-3 bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xs">
          {/* Question Meta & Star Bookmark */}
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
              Question {currentIndex + 1} of {questions.length}
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

          <div className="text-base sm:text-lg font-medium text-text-primary leading-relaxed mb-6">
            <MathRenderer content={currentQ.text} />
          </div>

          {/* Choices */}
          <div className="space-y-3">
            {currentQ.choices.map((choice, idx) => {
              const isSelected = answers.get(currentQ.id) === idx;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectChoice(idx)}
                  className={`w-full p-4 rounded-xl border text-left flex items-start gap-3.5 transition active:scale-[0.99] ${
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                      : 'border-border bg-bg-secondary hover:bg-card hover:border-primary/50 text-text-primary'
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                      isSelected
                        ? 'bg-primary text-white'
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

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((prev) => prev - 1)}
              className="py-2.5 px-4 rounded-xl border border-border text-sm font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> Previous
            </button>

            <span className="text-xs text-text-secondary">
              {answeredCount} of {questions.length} answered
            </span>

            <button
              type="button"
              disabled={currentIndex + 1 >= questions.length}
              onClick={() => setCurrentIndex((prev) => prev + 1)}
              className="py-2.5 px-5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover disabled:opacity-30 disabled:cursor-not-allowed transition shadow-xs flex items-center gap-1.5"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Question Navigator Grid */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs lg:sticky lg:top-36">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              Question Navigator
            </h3>
            <span className="text-xs font-bold text-primary">
              {answeredCount} / {questions.length}
            </span>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-5 gap-1.5 max-h-72 lg:max-h-96 overflow-y-auto pr-1">
            {questions.map((q, idx) => {
              const isCurrent = idx === currentIndex;
              const isAnswered = answers.has(q.id);

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-9 rounded-lg text-xs font-bold transition flex items-center justify-center border ${
                    isCurrent
                      ? 'border-primary ring-2 ring-primary ring-offset-1 text-primary bg-primary/20'
                      : isAnswered
                      ? 'bg-primary text-white border-primary'
                      : 'bg-bg-secondary text-text-secondary border-border hover:border-text-secondary'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[11px] text-text-secondary">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-primary inline-block"></span> Answered
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-bg-secondary border border-border inline-block"></span> Unanswered
            </span>
          </div>
        </div>
      </div>

      {/* Floating Interactive Computation Scratchpad */}
      <DoodleScratchpad
        isOpen={showScratchpad}
        onClose={() => setShowScratchpad(false)}
      />

      {/* Electronics Quick Reference Formula Sheet Modal */}
      <FormulaSheetModal
        isOpen={showFormulaSheet}
        onClose={() => setShowFormulaSheet(false)}
      />
    </div>
  );
}
