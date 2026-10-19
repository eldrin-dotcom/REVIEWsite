import React, { useState } from 'react';
import type { DuoStreakData } from 'shared';
import { Flame, CheckCircle2, Clock, Sparkles, Heart, Zap, Trophy } from 'lucide-react';

interface DinoPetCardProps {
  streakData: DuoStreakData;
  currentUsername?: string;
}

export default function DinoPetCard({ streakData, currentUsername }: DinoPetCardProps) {
  const [petClicks, setPetClicks] = useState(0);
  const [isWiggling, setIsWiggling] = useState(false);

  const { currentStreak, completedToday, atRisk, users, dino } = streakData;

  const john = users.find((u) => u.username === 'john') || {
    displayName: 'John',
    answeredToday: 0,
    targetToday: 10,
    completedToday: false,
  };
  const hon = users.find((u) => u.username === 'emma') || {
    displayName: 'Hon',
    answeredToday: 0,
    targetToday: 10,
    completedToday: false,
  };

  const handlePetDino = () => {
    setPetClicks((c) => c + 1);
    setIsWiggling(true);
    setTimeout(() => setIsWiggling(false), 600);
  };

  // Dynamic speech bubble message based on live status
  let speechText = '';
  if (completedToday) {
    speechText = 'ROAAR! 🦖 Duo streak saved for today! You two are an unstoppable duo!';
  } else if (john.completedToday && !hon.completedToday) {
    speechText = currentUsername === 'emma'
      ? `John finished his 10! You need ${10 - hon.answeredToday} more questions to save our streak! Let's go Hon! 💖`
      : `You finished your 10! Waiting for Hon (${hon.answeredToday}/10) to save our streak today! ⏳`;
  } else if (hon.completedToday && !john.completedToday) {
    speechText = currentUsername === 'john'
      ? `Hon finished her 10! You need ${10 - john.answeredToday} more questions to save our streak! Let's go John! ⚡`
      : `You finished your 10! Waiting for John (${john.answeredToday}/10) to save our streak today! ⏳`;
  } else {
    speechText = currentStreak > 0
      ? `Our ${currentStreak}-day streak is waiting! Both of you need 10 questions today to keep Rexy happy! 🦖`
      : `Let's start our Duo Streak! Answer 10 questions each today to hatch Rexy! 🥚`;
  }

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500/10 via-card to-primary/5 border border-emerald-500/20 rounded-3xl p-5 sm:p-6 shadow-sm">
      {/* Background ambient decorative glow */}
      <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-10 -top-10 w-44 h-44 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar: Streak badge & Pet level */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          {/* Flame Badge */}
          <div
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black tracking-wide border shadow-xs transition-transform active:scale-95 ${
              completedToday
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-500 animate-pulse'
                : atRisk
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-500'
                : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
            }`}
          >
            <Flame className="w-4 h-4 fill-current" />
            <span>{currentStreak} DAY DUO STREAK</span>
          </div>

          {atRisk && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-danger/10 text-danger border border-danger/20">
              <Clock className="w-3 h-3" /> Streak at Risk!
            </span>
          )}

          {completedToday && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-success/15 text-success border border-success/30">
              <Sparkles className="w-3 h-3" /> Streak Saved!
            </span>
          )}
        </div>

        {/* Dino Title / Level */}
        <div className="flex items-center gap-1.5 text-xs font-bold text-text-secondary bg-bg-secondary px-3 py-1 rounded-full border border-border">
          <Trophy className="w-3.5 h-3.5 text-amber-500" />
          <span>{dino.title} (Lvl {dino.level})</span>
        </div>
      </div>

      {/* Main Content: Dino Mascot + Speech Bubble */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
        {/* Dino Interactive Mascot */}
        <div className="sm:col-span-4 flex flex-col items-center justify-center">
          <button
            type="button"
            onClick={handlePetDino}
            className={`group relative p-3 rounded-3xl cursor-pointer transition-all duration-300 hover:scale-105 ${
              isWiggling ? 'animate-bounce' : ''
            }`}
            title="Click to pet Rexy!"
          >
            {/* Dinosaur Graphic Canvas */}
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center">
              <DinoIllustration stage={dino.stage} mood={dino.mood} />
            </div>

            <span className="text-[10px] text-text-secondary/70 font-semibold group-hover:text-primary transition block text-center mt-1">
              {petClicks > 0 ? `Petted ${petClicks}x! 💚` : 'Tap to pet Rexy! 🦖'}
            </span>
          </button>
        </div>

        {/* Speech Bubble & Progress Bars */}
        <div className="sm:col-span-8 space-y-4">
          {/* Speech Bubble */}
          <div className="relative bg-card/90 backdrop-blur-sm border border-border rounded-2xl p-3.5 sm:p-4 shadow-xs text-xs sm:text-sm text-text-primary leading-relaxed">
            <div className="font-semibold text-primary mb-0.5 flex items-center gap-1.5">
              <span>{dino.name} says:</span>
            </div>
            <p className="text-text-secondary font-medium">{speechText}</p>
          </div>

          {/* Daily 10-Question Progress for John and Hon */}
          <div className="bg-bg-secondary/70 rounded-2xl p-3.5 sm:p-4 border border-border/80 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-text-secondary">
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-500" /> Daily TikTok-Style Target
              </span>
              <span className="text-[11px] font-normal text-text-secondary">
                10 questions each to advance
              </span>
            </div>

            <div className="space-y-2.5">
              {/* John Progress */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1 font-semibold">
                  <span className="flex items-center gap-1.5 text-text-primary">
                    <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                    John
                  </span>
                  <span className={john.completedToday ? 'text-success font-bold flex items-center gap-1' : 'text-text-secondary'}>
                    {john.completedToday ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> 10 / 10 Completed
                      </>
                    ) : (
                      `${john.answeredToday} / 10 questions`
                    )}
                  </span>
                </div>
                <div className="h-2 w-full bg-border rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      john.completedToday ? 'bg-success' : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(100, (john.answeredToday / 10) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Hon Progress */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1 font-semibold">
                  <span className="flex items-center gap-1.5 text-text-primary">
                    <Heart className="w-3 h-3 text-rose-500 fill-rose-500 inline-block" />
                    Hon
                  </span>
                  <span className={hon.completedToday ? 'text-rose-500 font-bold flex items-center gap-1' : 'text-text-secondary'}>
                    {hon.completedToday ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> 10 / 10 Completed
                      </>
                    ) : (
                      `${hon.answeredToday} / 10 questions`
                    )}
                  </span>
                </div>
                <div className="h-2 w-full bg-border rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      hon.completedToday ? 'bg-rose-500' : 'bg-rose-400'
                    }`}
                    style={{ width: `${Math.min(100, (hon.answeredToday / 10) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Cute, scalable SVG Dinosaur Mascot with accessories based on stage
 */
function DinoIllustration({ stage, mood }: { stage: string; mood: string }) {
  const isExcited = mood === 'celebrating';

  return (
    <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-md">
      {/* Background Soft Glow */}
      <circle cx="60" cy="60" r="50" fill="#10b981" opacity="0.12" />

      {/* Main Dino Body (Cute rounded T-Rex shape) */}
      <g className={isExcited ? 'animate-pulse' : ''}>
        {/* Tail */}
        <path
          d="M 35 75 Q 15 80 12 60 Q 25 65 40 70 Z"
          fill="#10b981"
          stroke="#059669"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Tail spikes */}
        <polygon points="18,65 24,61 24,68" fill="#34d399" />
        <polygon points="27,67 33,63 33,71" fill="#34d399" />
        <polygon points="36,69 42,65 42,73" fill="#34d399" />

        {/* Back Leg Left */}
        <ellipse cx="44" cy="88" rx="8" ry="6" fill="#059669" />

        {/* Main Body */}
        <ellipse cx="58" cy="68" rx="22" ry="24" fill="#10b981" stroke="#059669" strokeWidth="2.5" />

        {/* Belly Patch (soft pastel cream/yellow) */}
        <ellipse cx="64" cy="72" rx="13" ry="17" fill="#fef08a" opacity="0.85" />

        {/* Back Leg Right */}
        <ellipse cx="68" cy="90" rx="9" ry="7" fill="#10b981" stroke="#059669" strokeWidth="2" />
        {/* Toes */}
        <circle cx="64" cy="95" r="2" fill="#047857" />
        <circle cx="68" cy="96" r="2" fill="#047857" />
        <circle cx="72" cy="95" r="2" fill="#047857" />

        {/* Dino Head */}
        <path
          d="M 50 54 C 50 34, 88 34, 88 48 C 88 56, 82 62, 72 64 C 64 64, 52 64, 50 54 Z"
          fill="#10b981"
          stroke="#059669"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Snout bump */}
        <ellipse cx="82" cy="49" rx="6" ry="6" fill="#10b981" />
        {/* Nostril */}
        <circle cx="84" cy="47" r="1.5" fill="#047857" />

        {/* Rosy Cheek */}
        <ellipse cx="64" cy="54" rx="4" ry="2.5" fill="#f43f5e" opacity="0.6" />

        {/* Cute Dino Eyes */}
        <circle cx="70" cy="43" r="5.5" fill="#111827" />
        <circle cx="72" cy="41.5" r="2" fill="#ffffff" />
        <circle cx="68.5" cy="44.5" r="1" fill="#ffffff" />

        {/* Smile */}
        {isExcited ? (
          <path d="M 74 53 Q 80 59 84 52" fill="#f43f5e" stroke="#047857" strokeWidth="1.5" />
        ) : (
          <path d="M 74 53 Q 79 57 83 53" fill="none" stroke="#047857" strokeWidth="2" strokeLinecap="round" />
        )}

        {/* Tiny Front Arm */}
        <path
          d="M 68 64 Q 78 68 76 72 Q 72 73 68 68 Z"
          fill="#10b981"
          stroke="#059669"
          strokeWidth="2"
        />
      </g>

      {/* ACCESSORIES BASED ON STAGE */}

      {/* Level 1: Egg Shell on head or Baby Egg */}
      {stage === 'egg' && (
        <g transform="translate(62, 28)">
          <path
            d="M -12 12 Q -12 0 0 -2 Q 12 0 12 12 L 8 8 L 4 12 L 0 8 L -4 12 L -8 8 Z"
            fill="#f8fafc"
            stroke="#94a3b8"
            strokeWidth="1.5"
          />
        </g>
      )}

      {/* Level 2: Nerd Glasses & Study Headband */}
      {stage === 'study' && (
        <g>
          {/* Glasses */}
          <circle cx="70" cy="43" r="7.5" fill="none" stroke="#3b82f6" strokeWidth="2" />
          <line x1="62.5" y1="43" x2="57" y2="44" stroke="#3b82f6" strokeWidth="1.5" />
          {/* Headband */}
          <path d="M 52 38 Q 68 33 86 38" fill="none" stroke="#ef4444" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="68" cy="35.5" r="2" fill="#fef08a" />
        </g>
      )}

      {/* Level 3: Tech Dino with Soldering Iron / Circuits */}
      {stage === 'tech' && (
        <g>
          {/* Goggles on forehead */}
          <ellipse cx="64" cy="36" rx="6" ry="4" fill="#38bdf8" stroke="#0284c7" strokeWidth="1.5" />
          <ellipse cx="76" cy="36" rx="6" ry="4" fill="#38bdf8" stroke="#0284c7" strokeWidth="1.5" />
          <line x1="70" y1="36" x2="70" y2="36" stroke="#0284c7" strokeWidth="2" />

          {/* Soldering Iron in arm */}
          <line x1="74" y1="70" x2="88" y2="76" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="88" y1="76" x2="94" y2="78" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
          {/* Spark */}
          <circle cx="95" cy="79" r="2" fill="#fbbf24" className="animate-ping" />
        </g>
      )}

      {/* Level 4 / 5: Top Notcher Gold Crown & Diploma */}
      {(stage === 'top_notcher' || stage === 'master') && (
        <g>
          {/* Golden Crown */}
          <polygon
            points="60,30 63,22 68,27 73,20 78,27 83,22 86,30"
            fill="#eab308"
            stroke="#ca8a04"
            strokeWidth="1.5"
          />
          <circle cx="73" cy="20" r="1.5" fill="#f43f5e" />

          {/* Diploma rolled with red ribbon */}
          <rect x="74" y="66" width="16" height="5" rx="2" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" transform="rotate(-15 74 66)" />
          <rect x="80" y="65" width="3" height="6" fill="#ef4444" transform="rotate(-15 80 65)" />
        </g>
      )}
    </svg>
  );
}
