# AWS CLF-C02 Practice Quiz App

A modern React + Vite + TypeScript practice app for the AWS Certified Cloud Practitioner (CLF-C02) exam. All 597 questions from the workspace `README.md` are parsed into a structured JSON file and served through a clean, exam-style UI.

## Features

- 597 unique questions parsed from the source `README.md`
- Custom-length random quizzes (5 – 597 questions)
- Topic filtering (EC2, S3, Billing, IAM, etc.)
- Single-answer + multi-answer support with proper grading
- Live answer reveal with correct/incorrect highlighting
- Score, pass/fail (≥70%), and per-topic breakdown on results
- Review of all incorrectly answered questions
- Quiz history persisted in `localStorage`
- Browse-and-search mode for the entire question bank

## Quick Start

```bash
cd aws-quiz-app
npm install
npm run parse   # generates src/data/questions.json from ../README.md
npm run dev     # starts Vite dev server at http://localhost:5173
```

## Build

```bash
npm run build       # type-checks and builds to dist/
npm run preview     # serves the production build locally
```

## How Questions Are Parsed

The script `scripts/parse-questions.js` reads the workspace-root `README.md`, walks every `### …` heading in the questions section, captures the following `- [ ] / - [x]` option lines, and writes a typed JSON array to `src/data/questions.json`:

```json
{
  "id": 1,
  "question": "...",
  "options": [{ "id": "A", "text": "..." }, ...],
  "correctAnswers": ["D"],
  "isMultiple": false,
  "topic": "EC2"
}
```

Re-run `npm run parse` whenever the source README is updated to refresh the question pool.

## Project Structure

```
aws-quiz-app/
├── scripts/parse-questions.js   # README.md → questions.json
├── src/
│   ├── data/questions.json      # generated question bank
│   ├── types/                   # TypeScript types
│   ├── hooks/                   # useQuiz (context), useHistory (localStorage)
│   ├── utils/                   # shuffle, scoring helpers
│   ├── components/              # Navbar, ProgressBar, QuestionCard, OptionButton, ScoreBadge
│   └── pages/                   # Home, Quiz, Results, Browse
└── ...
```

## Tech Stack

- React 18 + TypeScript
- Vite 5
- React Router 6
- Tailwind CSS 3
