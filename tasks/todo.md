# REVIEWsite — Task Checklist

## Phase 1: Foundation
- [x] Task 1: Project scaffolding (monorepo, Vite+React, Express+TS, Tailwind, Drizzle)
- [x] Task 2: Database schema + seed data (all tables, exam types, subjects, 2 users seeded)
- [x] Task 3: Authentication backend (login/logout, signed HttpOnly cookies, auth middleware)
- [x] Task 4: Auth UI + Theme context (login page with quick selector, auth/theme providers, route protection, CSS themes)

### Checkpoint: Foundation
- [x] Both users can log in and see a themed home page
- [x] API routes are protected
- [x] Database has exam types and subjects seeded

## Phase 2: Question Management
- [x] Task 5: JSON upload API (validate, auto-create topics, batch insert, duplicate detection)
- [x] Task 6: Upload UI + question browser (drag-drop, preview, duplicate warnings, question count tree)

### Checkpoint: Question Management
- [x] Can upload JSON question banks through the UI
- [x] Both users see imported questions

## Phase 3: Quiz Engine
- [x] Task 7: Practice mode backend (start session, serve questions, instant feedback)
- [x] Task 8: Practice mode UI (topic selection, math formula rendering, instant explanation panel, type filtering)
- [x] Task 9: Exam mode backend (timed session, batch submit, server-enforced timer)
- [x] Task 10: Exam mode UI (countdown timer, customizable time limit, question navigation grid, review page)

### Checkpoint: Quiz Engine
- [x] Practice mode works end-to-end
- [x] Exam mode works with timer and review
- [x] Both users' answers stored separately

## Phase 4: Progress Tracking
- [x] Task 11: Progress API (overall stats, per-subject/topic accuracy, history)
- [x] Task 12: Progress dashboard UI (radar chart, trend chart, recent sessions)

### Checkpoint: Progress Tracking
- [x] Dashboard shows accurate scores
- [x] Score trend shows improvement over time
- [x] Each user sees only their own progress

## Phase 5: Polish + Theming
- [x] Task 13: Theme selector + settings page (Light, Dark, and Pink themes with palette swatches)
- [x] Task 14: Mobile responsiveness polish (touch friendly, thumb-reachable bottom navbar)
- [x] Task 15: KaTeX math formula rendering for computation problems
- [x] Task 16: Single-port static production build integration

### Checkpoint: Complete
- [x] All features working on mobile and desktop
- [x] Both users operational with isolated progress tracking
- [x] Ready to review and drill for Top Notcher! 🎯
