# AWS Certification Practice Hub

React + Vite + TypeScript app for timed practice quizzes across AWS certifications. Exams are normalized JSON banks under [`src/data/exams/`](src/data/exams/) and listed in [`src/data/exams/catalog.json`](src/data/exams/catalog.json). Attempt history is saved in **localStorage** (key `cert-quiz-history-v2`), with backward migration from legacy `aws-quiz-history`.

Included exams today:

| Code    | Dataset file              | Notes |
| ------- | ------------------------- | ----- |
| CLF-C02 | `exams/aws-clf-c02.json`  | Cloud Practitioner — regenerated from sibling `README.md` via `npm run parse` |
| SAA-C03 | `exams/aws-saa-c03.json`  | Solutions Architect Associate — regenerated from [`public/aws-saa-practice-exam.md`](public/aws-saa-practice-exam.md) via `npm run ingest:saa` |

## Flow

1. **Home:** pick a certification, then configure topic + question count (min 5, up to the pool size).
2. **Quiz:** countdown = **120 seconds × (number of questions in that run)**. No per-question correct/incorrect styling until the quiz ends (or auto-submit when time hits zero).
3. **Results:** full scoring, topic breakdown, and a **detailed review** of every item (your answers vs keyed answers).

## Scripts

```bash
npm install
npm run dev          # http://localhost:5173

# CLF checklist source (workspace ../README.md) → aws-clf-c02.json
npm run parse

# SAA markdown → aws-saa-c03.json (content is in public/)
npm run ingest:saa

# One-off: legacy src/data/questions.json → exams/aws-clf-c02.json wrapper
npm run wrap-clf

npm run build        # type-check + Vite production bundle
npm run preview
```

## Adding a new exam

1. Add **`src/data/exams/<examId>.json`** with this envelope:

```json
{
  "examId": "my-exam-slug",
  "code": "ABC-999",
  "title": "Display title",
  "passThresholdPercent": 72,
  "questions": [
    {
      "id": 1,
      "question": "Stem text?",
      "options": [{ "id": "A", "text": "..." }],
      "correctAnswers": ["A"],
      "isMultiple": false,
      "topic": "DomainOrTopicTag"
    }
  ]
}
```

2. Import the bank inside [`src/utils/exams.ts`](src/utils/exams.ts) (`BANK_MAP`) and append an entry to [`catalog.json`](src/data/exams/catalog.json).
3. Rebuild; the home grid and browse picker will surface the new catalog row automatically.

Paths are statically imported today (simple deploy); splitting by `import()` is an easy follow-on if bundles grow too large.

## Tech stack

- React 18, TypeScript, Vite 5, React Router 6, Tailwind CSS 3

## Netlify / SPA routing

SPA fallback is configured via `netlify.toml` so `/quiz`, `/results`, `/browse`, and `/browse?exam=…` work on reload.
