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

## Deploy to Netlify

A `netlify.toml` lives at the **workspace root** (one level above this folder) and is already configured:

```toml
[build]
  base    = "aws-quiz-app"
  command = "npm run build"
  publish = "dist"
```

It also includes a SPA fallback so client-side routes (`/quiz`, `/results`, `/browse`) work on direct hits or refresh.

### Option 1 — Netlify CLI (one-shot deploy)

From the workspace root (the folder that contains `netlify.toml`):

```bash
npm install -g netlify-cli
netlify login
netlify deploy --build           # creates a draft preview URL
netlify deploy --build --prod    # promotes to production
```

### Option 2 — Connect the Git repo

1. Push the workspace to GitHub/GitLab/Bitbucket.
2. In Netlify: **Add new site → Import an existing project**, pick the repo.
3. Netlify reads `netlify.toml` automatically — no UI config needed.
4. Every push to the default branch deploys; every PR gets a preview URL.

### Option 3 — Manual upload

```bash
cd aws-quiz-app
npm install
npm run build
```

Drag the resulting `aws-quiz-app/dist/` folder onto the Netlify dashboard's deploys page.

### Notes

- Build runs on Linux (Node 20) regardless of where you develop.
- The Windows-only `.npmrc` (`script-shell=powershell.exe`) is overridden on Netlify via `NPM_CONFIG_SCRIPT_SHELL=/bin/bash` in `netlify.toml`, so it's safe to commit.
- The build script (`scripts/build.js`) is cross-platform and avoids the `&&` operator (which Windows PowerShell 5.1 doesn't support).
