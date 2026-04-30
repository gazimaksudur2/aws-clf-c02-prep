// One-time / maintenance: wraps legacy src/data/questions.json into exams/aws-clf-c02.json
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const src = resolve(root, 'src', 'data', 'questions.json');
const outDir = resolve(root, 'src', 'data', 'exams');
const outPath = resolve(outDir, 'aws-clf-c02.json');

const questions = JSON.parse(readFileSync(src, 'utf8'));
mkdirSync(outDir, { recursive: true });
const bank = {
  examId: 'aws-clf-c02',
  code: 'CLF-C02',
  title: 'AWS Certified Cloud Practitioner',
  passThresholdPercent: 70,
  sourceNote:
    'Generated from src/data/questions.json (legacy checklist parse). Prefer editing exam JSON or re-running npm run parse after updating scripts/parse-questions.js output path.',
  questions,
};
writeFileSync(outPath, JSON.stringify(bank));
