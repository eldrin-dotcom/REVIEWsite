import React, { useState } from 'react';
import type { DuoStreakData } from 'shared';
import { Flame, CheckCircle2, Clock, Sparkles, Heart, Zap, Trophy, X } from 'lucide-react';

interface DinoPetCardProps {
  streakData: DuoStreakData;
  currentUsername?: string;
}

interface PartyParticle {
  id: number;
  emoji: string;
  left: number;
  delay: number;
  duration: number;
  size: number;
  rot: number;
}

const CELEBRATION_EMOJIS = ['💖', '💕', '✨', '🦖', '⭐', '🐾', '🌸', '💫'];

function generateParticles(): PartyParticle[] {
  return Array.from({ length: 32 }, (_, i) => ({
    id: i,
    emoji: CELEBRATION_EMOJIS[i % CELEBRATION_EMOJIS.length],
    left: Math.floor(Math.random() * 92) + 4,
    delay: (i * 0.07) % 1.2,
    duration: 2.8 + (i % 5) * 0.35,
    size: 1.2 + (i % 4) * 0.4,
    rot: (i % 2 === 0 ? 1 : -1) * (20 + (i % 30)),
  }));
}

/**
 * Sweet 4-note chime synthesized in browser without external files
 */
function playCuteChime() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 (joyful arpeggio)
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
      gain.gain.setValueAtTime(0.06, ctx.currentTime + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.32);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.08);
      osc.stop(ctx.currentTime + idx * 0.08 + 0.35);
    });
  } catch {
    // Graceful fallback if audio is blocked
  }
}

export default function DinoPetCard({ streakData, currentUsername }: DinoPetCardProps) {
  const [petClicks, setPetClicks] = useState(0);
  const [consecutivePets, setConsecutivePets] = useState(0);
  const [isWiggling, setIsWiggling] = useState(false);
  const [showPartyEvent, setShowPartyEvent] = useState(false);
  const [particles, setParticles] = useState<PartyParticle[]>([]);

  const { currentStreak, completedToday, atRisk, users, dino } = streakData;
  const isSad = !completedToday;

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
    const nextPets = consecutivePets + 1;
    setPetClicks((c) => c + 1);
    setIsWiggling(true);
    setTimeout(() => setIsWiggling(false), 700);

    if (nextPets >= 3) {
      setConsecutivePets(0);
      setParticles(generateParticles());
      setShowPartyEvent(true);
      playCuteChime();
      setTimeout(() => {
        setShowPartyEvent(false);
      }, 4500);
    } else {
      setConsecutivePets(nextPets);
    }
  };

  // Dynamic speech bubble message based on live status
  let speechText = '';
  if (completedToday) {
    speechText = 'ROAAR! 🦖 Duo streak saved for today! You two are an unstoppable duo!';
  } else if (john.completedToday && !hon.completedToday) {
    speechText = currentUsername === 'emma'
      ? `John finished his 10! Rexy needs ${10 - hon.answeredToday} more questions from you to save our streak! Let's go Hon! 💖`
      : `You finished your 10! Rexy is waiting for Hon (${hon.answeredToday}/10) to save our streak today! ⏳`;
  } else if (hon.completedToday && !john.completedToday) {
    speechText = currentUsername === 'john'
      ? `Hon finished her 10! Rexy needs ${10 - john.answeredToday} more questions from you to save our streak! Let's go John! ⚡`
      : `You finished your 10! Rexy is waiting for John (${john.answeredToday}/10) to save our streak today! ⏳`;
  } else {
    speechText = currentStreak > 0
      ? `Rexy is shivering in his egg... 🥺 Both of you need 10 questions today to keep our ${currentStreak}-day streak and make him happy!`
      : `Rexy is waiting in his egg! Answer 10 questions each today to hatch him and start your Duo Streak! 🥚🦖`;
  }

  return (
    <>
      {/* ============================================================== */}
      {/* Full-Screen 3-Pet Celebration Event Overlay                   */}
      {/* ============================================================== */}
      {showPartyEvent && (
        <div
          onClick={() => setShowPartyEvent(false)}
          className="fixed inset-0 z-50 flex flex-col items-center justify-start pt-14 px-4 bg-black/15 backdrop-blur-[2px] transition-all duration-300 cursor-pointer"
        >
          {/* Ambient glowing pastel border vignette */}
          <div className="absolute inset-0 pointer-events-none border-8 border-pink-400/40 rounded-none animate-pulse" />

          {/* Floating celebratory particles flurry */}
          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute pointer-events-none select-none drop-shadow-md"
              style={
                {
                  left: `${p.left}%`,
                  animation: `floatUpParticle ${p.duration}s cubic-bezier(0.2, 0.8, 0.2, 1) forwards`,
                  animationDelay: `${p.delay}s`,
                  fontSize: `${p.size}rem`,
                  '--rot': `${p.rot}deg`,
                } as React.CSSProperties
              }
            >
              {p.emoji}
            </div>
          ))}

          {/* Celebratory Banner */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative pointer-events-auto bg-card/95 border-2 border-pink-400/80 shadow-2xl rounded-3xl p-5 sm:p-6 max-w-md w-full text-center animate-bounce-slow transform transition-all duration-300"
          >
            <button
              type="button"
              onClick={() => setShowPartyEvent(false)}
              className="absolute top-3 right-3 text-text-secondary hover:text-text-primary p-1 rounded-full hover:bg-bg-secondary"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black bg-gradient-to-r from-pink-500 to-rose-500 text-white mb-2 shadow-xs">
              <Sparkles className="w-3.5 h-3.5" /> 3 PETS CUDDLE FIESTA! 💕
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">
              Rexy is Overjoyed! 🦖✨
            </h3>
            <p className="text-xs sm:text-sm text-text-secondary mt-1.5 font-medium leading-relaxed">
              *happy baby dino squeak!* Rawwwr! Rexy showered John &amp; Hon with affectionate cuddles and board exam passing energy!
            </p>

            <div className="mt-4 pt-3 border-t border-border flex items-center justify-center gap-2 sm:gap-4 text-xs font-bold text-pink-500">
              <span>💖 +100 Dino Love</span>
              <span>·</span>
              <span>🦖 Unstoppable Duo</span>
              <span>·</span>
              <span>🎓 100% Passed</span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* Dino Pet Dashboard Card                                        */}
      {/* ============================================================== */}
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
              className={`group relative p-3 rounded-3xl cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 ${
                isWiggling ? 'animate-bounce' : ''
              }`}
              title="Click to pet Rexy! (3 pets triggers a surprise)"
            >
              {/* Dinosaur Graphic Canvas */}
              <div className="relative w-32 h-32 sm:w-36 sm:h-36 flex items-center justify-center">
                <DinoIllustration
                  stage={dino.stage}
                  mood={dino.mood}
                  isSad={isSad}
                  isCelebrating={completedToday || showPartyEvent}
                />
              </div>

              <span className="text-[10px] text-text-secondary/80 font-semibold group-hover:text-primary transition block text-center mt-1">
                {consecutivePets === 0
                  ? petClicks > 0
                    ? `Petted ${petClicks}x! (3 = surprise ✨)`
                    : 'Tap to pet Rexy! (3x = surprise ✨)'
                  : consecutivePets === 1
                  ? 'Pet again! (1/3) 💚'
                  : 'Almost there! (2/3) 💕'}
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
                  <Zap className="w-3.5 h-3.5 text-amber-500" /> Daily Target
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
    </>
  );
}

/**
 * Scalable SVG Dinosaur Mascot.
 * In baby stage ('egg'), Rexy is nestled inside a giant cracked eggshell that is visibly much larger than him!
 * Features sad animations (shivering, teardrop, pout) when streak is not yet obtained today.
 */
function DinoIllustration({
  stage,
  mood,
  isSad,
  isCelebrating,
}: {
  stage: string;
  mood: string;
  isSad: boolean;
  isCelebrating: boolean;
}) {
  const isExcited = mood === 'celebrating' || isCelebrating;

  // ==============================================================
  // LEVEL 1: BABY DINO IN GIANT CRACKED EGGSHELL
  // ==============================================================
  if (stage === 'egg') {
    return (
      <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-md overflow-visible">
        {/* Soft background ambient glow */}
        <circle cx="60" cy="65" r="50" fill={isSad ? '#38bdf8' : '#10b981'} opacity={isSad ? '0.08' : '0.14'} />

        <g className={isSad ? 'animate-dino-shiver' : isExcited ? 'animate-bounce' : ''}>
          {/* Giant Inside Eggshell Shadow */}
          <path
            d="M 14,72 C 16,50 36,44 60,44 C 84,44 104,50 106,72 Z"
            fill="#fef08a"
            opacity="0.45"
          />

          {/* Tiny Baby Dino Nestled Inside */}
          <g transform="translate(60, 56) scale(0.68) translate(-60, -56)">
            {/* Dino Head & Snout */}
            <path
              d="M 44 56 C 44 32, 84 32, 84 48 C 84 56, 78 62, 68 64 C 60 64, 46 64, 44 56 Z"
              fill="#10b981"
              stroke="#059669"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {/* Snout bump */}
            <ellipse cx="78" cy="48" rx="6" ry="6" fill="#10b981" />
            <circle cx="80" cy="46" r="1.5" fill="#047857" />

            {/* Rosy Baby Cheek */}
            <ellipse cx="56" cy="54" rx="5" ry="3" fill="#f43f5e" opacity="0.6" />

            {/* Eyes & Mouth: Sad vs Happy */}
            {isSad ? (
              <>
                {/* Sad Slanted Eyebrow */}
                <line x1="56" y1="36" x2="65" y2="39" stroke="#047857" strokeWidth="2.5" strokeLinecap="round" />
                {/* Sad Watery Puppy Pupil */}
                <ellipse cx="64" cy="44" rx="5" ry="5.5" fill="#111827" />
                <circle cx="65.5" cy="42.5" r="2" fill="#ffffff" />
                <circle cx="62" cy="46" r="1.2" fill="#ffffff" />
                {/* Dripping Teardrop */}
                <path
                  d="M 56 56 C 54 59 52 62 52 64 C 52 66.5 54 68 56 68 C 58 68 60 66.5 60 64 C 60 62 58 59 56 56 Z"
                  fill="#38bdf8"
                  className="animate-dino-tear"
                />
                {/* Sad Quivering Frown */}
                <path d="M 67 57 Q 72 52 77 56" fill="none" stroke="#047857" strokeWidth="2" strokeLinecap="round" />
              </>
            ) : (
              <>
                {/* Happy Sparkling Eye */}
                <circle cx="65" cy="42" r="5" fill="#111827" />
                <circle cx="67" cy="40.5" r="2" fill="#ffffff" />
                <circle cx="63.5" cy="43.5" r="1" fill="#ffffff" />
                {/* Happy Smiling Mouth */}
                <path d="M 68 52 Q 74 61 79 52 Z" fill="#f43f5e" stroke="#047857" strokeWidth="1.5" />
              </>
            )}
          </g>

          {/* Giant Front Cracked Eggshell (Spanning almost entire width, much larger than Rexy) */}
          <path
            d="M 14,72 L 26,82 L 36,68 L 48,84 L 60,70 L 72,84 L 84,68 L 94,82 L 106,72 C 110,104 92,114 60,114 C 28,114 10,104 14,72 Z"
            fill="#fefce8"
            stroke="#cbd5e1"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Eggshell Pastel Polka Dots */}
          <circle cx="32" cy="98" r="4.5" fill="#a7f3d0" opacity="0.85" />
          <circle cx="50" cy="103" r="5" fill="#fde68a" opacity="0.9" />
          <circle cx="74" cy="99" r="4.5" fill="#fecdd3" opacity="0.85" />
          <circle cx="88" cy="88" r="3.5" fill="#a7f3d0" opacity="0.85" />
          <circle cx="24" cy="86" r="3" fill="#fde68a" opacity="0.9" />

          {/* Shell Cracks */}
          <path d="M 48,84 L 51,92 L 46,98" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 72,84 L 70,91 L 74,96" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />

          {/* Tiny Baby Paws Peeking over Rim */}
          <ellipse cx="44" cy="74" rx="4.5" ry="3.5" fill="#10b981" stroke="#059669" strokeWidth="1.5" />
          <circle cx="43" cy="73" r="0.8" fill="#ffffff" />
          <circle cx="45" cy="73" r="0.8" fill="#ffffff" />

          <ellipse cx="76" cy="74" rx="4.5" ry="3.5" fill="#10b981" stroke="#059669" strokeWidth="1.5" />
          <circle cx="75" cy="73" r="0.8" fill="#ffffff" />
          <circle cx="77" cy="73" r="0.8" fill="#ffffff" />

          {/* Giant Cracked Top Shell Cap Perched on Head */}
          <g transform="translate(60, 26)">
            <path
              d="M -22 14 Q 0 -12 22 14 L 16 9 L 8 16 L 0 8 L -8 16 L -16 9 Z"
              fill="#fefce8"
              stroke="#cbd5e1"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <circle cx="-6" cy="3" r="2.5" fill="#a7f3d0" opacity="0.8" />
            <circle cx="8" cy="4" r="2" fill="#fde68a" opacity="0.8" />
          </g>
        </g>
      </svg>
    );
  }

  // ==============================================================
  // OLDER STAGES: HATCHED FULL-SIZED DINO WITH ACCESSORIES
  // ==============================================================
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-md overflow-visible">
      <circle cx="60" cy="60" r="50" fill={isSad ? '#38bdf8' : '#10b981'} opacity={isSad ? '0.08' : '0.12'} />

      <g className={isSad ? 'animate-dino-shiver' : isExcited ? 'animate-pulse' : ''}>
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

        {/* Belly Patch */}
        <ellipse cx="64" cy="72" rx="13" ry="17" fill="#fef08a" opacity="0.85" />

        {/* Back Leg Right */}
        <ellipse cx="68" cy="90" rx="9" ry="7" fill="#10b981" stroke="#059669" strokeWidth="2" />
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

        {/* Snout bump & nostril */}
        <ellipse cx="82" cy="49" rx="6" ry="6" fill="#10b981" />
        <circle cx="84" cy="47" r="1.5" fill="#047857" />

        {/* Rosy Cheek */}
        <ellipse cx="64" cy="54" rx="4" ry="2.5" fill="#f43f5e" opacity="0.6" />

        {/* Eyes & Mouth (Sad vs Happy) */}
        {isSad ? (
          <>
            <line x1="62" y1="36" x2="71" y2="39" stroke="#047857" strokeWidth="2" strokeLinecap="round" />
            <ellipse cx="70" cy="44" rx="5.5" ry="6" fill="#111827" />
            <circle cx="71.5" cy="42.5" r="2" fill="#ffffff" />
            <circle cx="68" cy="46" r="1" fill="#ffffff" />
            <path
              d="M 64 56 C 62 59 60 62 60 64 C 60 66.5 62 68 64 68 C 66 68 68 66.5 68 64 C 68 62 66 59 64 56 Z"
              fill="#38bdf8"
              className="animate-dino-tear"
            />
            <path d="M 74 57 Q 79 52 83 56" fill="none" stroke="#047857" strokeWidth="2" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="70" cy="43" r="5.5" fill="#111827" />
            <circle cx="72" cy="41.5" r="2" fill="#ffffff" />
            <circle cx="68.5" cy="44.5" r="1" fill="#ffffff" />
            <path d="M 74 53 Q 80 59 84 52" fill="#f43f5e" stroke="#047857" strokeWidth="1.5" />
          </>
        )}

        {/* Tiny Front Arm */}
        <path
          d="M 68 64 Q 78 68 76 72 Q 72 73 68 68 Z"
          fill="#10b981"
          stroke="#059669"
          strokeWidth="2"
        />
      </g>

      {/* ACCESSORIES BASED ON EVOLVED STAGE */}

      {/* Level 2: Nerd Glasses & Study Headband */}
      {stage === 'study' && (
        <g>
          <circle cx="70" cy="43" r="7.5" fill="none" stroke="#3b82f6" strokeWidth="2" />
          <line x1="62.5" y1="43" x2="57" y2="44" stroke="#3b82f6" strokeWidth="1.5" />
          <path d="M 52 38 Q 68 33 86 38" fill="none" stroke="#ef4444" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="68" cy="35.5" r="2" fill="#fef08a" />
        </g>
      )}

      {/* Level 3: Tech Dino with Soldering Iron / Circuits */}
      {stage === 'tech' && (
        <g>
          <ellipse cx="64" cy="36" rx="6" ry="4" fill="#38bdf8" stroke="#0284c7" strokeWidth="1.5" />
          <ellipse cx="76" cy="36" rx="6" ry="4" fill="#38bdf8" stroke="#0284c7" strokeWidth="1.5" />
          <line x1="70" y1="36" x2="70" y2="36" stroke="#0284c7" strokeWidth="2" />
          <line x1="74" y1="70" x2="88" y2="76" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="88" y1="76" x2="94" y2="78" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="95" cy="79" r="2" fill="#fbbf24" className="animate-ping" />
        </g>
      )}

      {/* Level 4 / 5: Top Notcher Gold Crown & Diploma */}
      {(stage === 'top_notcher' || stage === 'master') && (
        <g>
          <polygon
            points="60,30 63,22 68,27 73,20 78,27 83,22 86,30"
            fill="#eab308"
            stroke="#ca8a04"
            strokeWidth="1.5"
          />
          <circle cx="73" cy="20" r="1.5" fill="#f43f5e" />
          <rect x="74" y="66" width="16" height="5" rx="2" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" transform="rotate(-15 74 66)" />
          <rect x="80" y="65" width="3" height="6" fill="#ef4444" transform="rotate(-15 80 65)" />
        </g>
      )}
    </svg>
  );
}
