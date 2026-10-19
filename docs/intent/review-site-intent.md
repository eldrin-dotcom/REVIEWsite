# REVIEWsite — Confirmed Intent

## Summary

A private quiz web app for Electronics Technician (ECT) licensure and pre-board exam review. Two users (John and girlfriend) drill questions from scanned review materials, track progress per subject/topic, and simulate real exam conditions — aiming for top notcher.

## Outcome

A private quiz web app for ET licensure and pre-board review — drill by subject/topic/type (conceptual/computation/mix), in practice or exam mode, with shared question banks uploaded via JSON and individual progress tracking.

## Users

John and his girlfriend — two accounts, basic authentication. No other users.

## Why Now

Pre-boards and the ECT licensure exam are a few months out. Need a structured, trackable way to drill scanned review materials instead of re-reading paper.

## Success Criteria

- Can identify weak topics per subject and drill them specifically
- Can simulate real exam pacing (timed, mixed, full-length)
- Watch scores climb subject by subject
- Ultimately place as top notcher on the ECT licensure exam

## Constraints

- Lightweight and cheap to run — Node.js + SQLite backend
- Deployable for free or near-free (Vercel, Netlify, or local)
- Questions come in via JSON files produced by a separate AI extraction step
- The app itself does NOT do OCR or AI scanning

## Out of Scope

- The AI scanning/OCR pipeline (separate tool/process)
- Spaced repetition algorithms
- Question editing/creation within the app
- Social features or third-party users
- Admin panels beyond JSON upload

---

## Key Features

### 1. Two Exam Contexts

**Pre-board:**
- MATH
- GEAS
- ELECTRONICS
- ESAT

**ECT Licensure:**
- Basic Math
- ELECTRONICS
- ESAT
- ECE Laws

Each subject contains sub-topics. Questions are tagged by exam type, subject, topic, and question type (conceptual/computation).

### 2. Practice Mode

- Select exam context → subject → topic
- Filter by question type: conceptual only, computation only, or mixed
- Untimed
- Instant answer reveal with explanation/solution after each question
- Drill as many or as few as you want

### 3. Exam Mode

- Full simulated exam: mixed questions across all subjects
- Countdown timer matching real exam conditions (~50-100 items per subject, fixed time block)
- No answer reveal during the exam
- Full review with correct answers and explanations after submission

### 4. JSON Upload Page

- Either user can upload JSON question bank files
- App validates JSON structure and previews import ("Found 50 questions for ELECTRONICS > Semiconductors")
- Imported questions are shared globally (visible to both users)
- JSON schema:

```json
{
  "examType": "ECT",
  "subject": "ELECTRONICS",
  "topic": "Semiconductors",
  "questions": [
    {
      "text": "What is the forward voltage of a silicon diode?",
      "type": "conceptual",
      "choices": ["0.3V", "0.7V", "1.2V", "5V"],
      "answer": 1,
      "explanation": "Silicon diodes have a forward voltage drop of approximately 0.7V..."
    }
  ]
}
```

### 5. Progress Dashboard

- Per-subject and per-topic score breakdowns
- Score history over time (trend visualization)
- Weak area identification
- Per-user (each user sees their own progress)

### 6. Per-User Theme

- Choice of: Light, Dark, or Pink
- Saved to user profile, persists across sessions

### 7. Mobile-Responsive

- Fully usable on phone and laptop
- Review on the go

### 8. Basic Authentication

- Simple login (username/password)
- 2 user accounts with separate progress tracking
- Session-based or token-based auth

---

## Tech Stack (Planned)

- **Frontend:** React (or similar) — mobile-responsive
- **Backend:** Node.js + Express
- **Database:** SQLite
- **Hosting:** Free tier (Vercel/Netlify/Railway) or local

---

*Confirmed by user on 2026-10-19.*
