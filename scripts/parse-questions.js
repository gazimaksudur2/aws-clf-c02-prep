// Parse the workspace README.md into a structured questions.json file.
// Run from the aws-quiz-app/ directory:
//   npm run parse
//
// The script:
//   - Locates the questions section (starts after the Table of Contents)
//   - For each "### <question>" heading, captures the following "- [ ]" / "- [x]" lines
//   - Detects multi-answer questions via phrases like "Choose TWO", "Select TWO", "2 correct answers"
//   - Assigns option IDs A, B, C, D, ...
//   - Tags each question with a topic derived from keyword matches (best-effort)
//
// Output: src/data/questions.json

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const README_PATH = resolve(__dirname, '..', '..', 'README.md');
const OUTPUT_PATH = resolve(__dirname, '..', 'src', 'data', 'questions.json');

const TOPIC_KEYWORDS = [
  ['EC2', /\bEC2\b|Elastic Compute Cloud/i],
  ['S3', /\bS3\b|Simple Storage Service/i],
  ['RDS', /\bRDS\b|Relational Database Service|Aurora|MySQL|PostgreSQL/i],
  ['DynamoDB', /DynamoDB/i],
  ['Lambda', /Lambda|serverless/i],
  ['VPC', /\bVPC\b|Virtual Private Cloud|subnet/i],
  ['IAM', /\bIAM\b|Identity and Access Management|principle of least privilege/i],
  ['CloudFront', /CloudFront|CDN|content delivery/i],
  ['CloudWatch', /CloudWatch/i],
  ['CloudTrail', /CloudTrail/i],
  ['Billing & Pricing', /billing|pricing|cost|budget|reserved instance|savings plan|on-demand|spot/i],
  ['Support Plans', /support plan|enterprise support|business support|TAM|concierge/i],
  ['Security', /security|encryption|KMS|WAF|Shield|GuardDuty|Inspector|Macie/i],
  ['Networking', /Direct Connect|Route 53|DNS|peering|gateway/i],
  ['Storage', /EBS|EFS|Glacier|Snowball|Storage Gateway/i],
  ['Migration', /migrate|migration|DMS|SMS/i],
  ['Shared Responsibility', /shared responsibility/i],
  ['Global Infrastructure', /Region|Availability Zone|edge location|global infrastructure/i],
  ['Compliance', /compliance|Artifact|SOC|audit|governance/i],
  ['Cloud Concepts', /elasticity|scalability|agility|high availability|fault tolerance|decoupling/i],
];

function detectTopic(question) {
  for (const [topic, regex] of TOPIC_KEYWORDS) {
    if (regex.test(question)) return topic;
  }
  return 'General';
}

function isMultiAnswer(question, correctCount) {
  if (correctCount > 1) return true;
  return /\(?(choose|select)\s+(two|three|2|3)\)?|2 correct answers|3 correct answers/i.test(
    question,
  );
}

function parseReadme(markdown) {
  const lines = markdown.split(/\r?\n/);
  const questions = [];

  // Skip everything before the first H3 that follows the Table of Contents.
  // The first H3 question is right after the TOC ends. We start scanning once
  // we see "### " AFTER the table of contents section.
  let inQuestionsSection = false;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!inQuestionsSection) {
      // The TOC is a markdown table; the first H3 after the table marks the start.
      if (line.startsWith('### ') && i > 100) {
        inQuestionsSection = true;
      } else {
        i += 1;
        continue;
      }
    }

    if (line.startsWith('### ')) {
      const questionText = line.replace(/^###\s+/, '').trim();
      const options = [];
      i += 1;

      while (i < lines.length) {
        const l = lines[i];
        if (l.startsWith('### ')) break;
        if (l.startsWith('## ')) break;
        const m = l.match(/^- \[( |x|X)\]\s+(.*)$/);
        if (m) {
          options.push({
            text: m[2].trim(),
            correct: m[1].toLowerCase() === 'x',
          });
        }
        i += 1;
      }

      if (options.length >= 2) {
        const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        const formattedOptions = options.map((o, idx) => ({
          id: optionLetters[idx],
          text: o.text,
        }));
        const correctAnswers = options
          .map((o, idx) => (o.correct ? optionLetters[idx] : null))
          .filter(Boolean);

        questions.push({
          id: questions.length + 1,
          question: questionText,
          options: formattedOptions,
          correctAnswers,
          isMultiple: isMultiAnswer(questionText, correctAnswers.length),
          topic: detectTopic(questionText),
        });
      }
    } else {
      i += 1;
    }
  }

  return questions;
}

function main() {
  console.log(`Reading: ${README_PATH}`);
  const md = readFileSync(README_PATH, 'utf8');

  const questions = parseReadme(md);
  console.log(`Parsed ${questions.length} questions`);

  const withCorrect = questions.filter((q) => q.correctAnswers.length > 0).length;
  const multi = questions.filter((q) => q.isMultiple).length;
  console.log(`  - With at least one correct answer: ${withCorrect}`);
  console.log(`  - Multi-answer questions: ${multi}`);

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(questions, null, 2), 'utf8');
  console.log(`Wrote: ${OUTPUT_PATH}`);
}

main();
