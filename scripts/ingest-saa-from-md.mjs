// Build src/data/exams/aws-saa-c03.json from public/aws-saa-practice-exam.md
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const MD_PATH = resolve(root, 'public', 'aws-saa-practice-exam.md');
const OUT_PATH = resolve(root, 'src', 'data', 'exams', 'aws-saa-c03.json');

const TOPIC_KEYWORDS = [
  ['Architecting', /solutions architect|architecture|meet these requirements|What should .* recommend/i],
  ['IAM & Access', /\bIAM\b|Identity and Access|least privilege|MFA/i],
  ['Networking', /\bVPC\b|subnet|NAT|Direct Connect|routing policy|Transit Gateway|peering/i],
  ['Compute', /\bEC2\b|EKS|ECS|Elastic Container|Auto Scaling/i],
  ['Storage', /\bS3\b|EBS|EFS|Elastic File System/i],
  ['Databases', /\bRDS\b|Aurora|DynamoDB|Neptune|ElastiCache/i],
  ['Security', /security group|encryption|KMS|WAF/i],
  ['DR & Availability', /disaster recovery|RPO|RTO|Multi-AZ|failover/i],
  ['Well-Architected', /Well-Architected/i],
  ['CDN & DNS', /CloudFront|Route 53/i],
  ['Analytics', /Athena|Kinesis/i],
  ['Misc', /.*/],
];

function detectTopic(prompt) {
  for (const [topic, regex] of TOPIC_KEYWORDS) {
    if (regex.test(prompt)) return topic;
  }
  return 'Misc';
}

function isQuestionStartLine(line) {
  return /^\d+\.\s/.test(line) && !/^\d+\.\s+\*\*/.test(line.trim());
}

function splitQuestionBlocks(lines) {
  /** @type {string[][]} */
  const blocks = [];
  /** @type {number | null} */
  let start = null;

  function pushBlock(endExclusive) {
    if (start === null || start >= endExclusive) return;
    blocks.push(lines.slice(start, endExclusive));
  }

  for (let i = 0; i < lines.length; i++) {
    if (isQuestionStartLine(lines[i])) {
      pushBlock(i);
      start = i;
    }
  }
  pushBlock(lines.length);
  return blocks.filter((bl) => bl.length > 0);
}

function sliceOptionLines(blockLines) {
  const idx = blockLines.findIndex((l) => l.trim() === 'Report Content Errors');
  if (idx < 0) return { optionLines: null, answerLine: null };
  const rest = blockLines.slice(idx + 1);
  const ai = rest.findIndex((l) =>
    /^The correct answers?\s+/i.test(l.trim()),
  );
  if (ai < 0) return { optionLines: null, answerLine: null };
  return {
    optionLines: rest.slice(0, ai),
    answerLine: rest[ai].trim(),
  };
}

/** @returns {{ id: string, text: string }[]} */
function parseOptions(optionLines) {
  /** @type { { id: string; textChunks: string[] }[] } */
  const parsed = [];

  let i = 0;
  while (i < optionLines.length) {
    const letter = optionLines[i].trim().match(/^([A-H])$/);
    if (!letter) {
      i++;
      continue;
    }
    const id = letter[1];
    i++;
    const textChunks = [];
    while (i < optionLines.length) {
      const trimmed = optionLines[i].trim();
      if (/^([A-H])$/.test(trimmed)) break;
      if (trimmed !== '') textChunks.push(trimmed);
      i++;
    }
    parsed.push({ id, textChunks });
  }

  const seen = new Set();
  /** @type {{ id: string, text: string }[]} */
  const options = [];
  for (const { id, textChunks } of parsed) {
    const text = textChunks.join(' ').replace(/\s+/g, ' ').trim();
    if (!/^[A-H]$/.test(id) || seen.has(id) || text.length === 0) continue;
    seen.add(id);
    options.push({ id, text });
  }
  return options;
}

/** @param {string} line */
function parseCorrectLetters(line) {
  const set = new Set();

  for (const m of line.matchAll(/\*\*([A-H])\s*:[\s\S]*?\*\*/gi)) {
    set.add(m[1].toUpperCase());
  }
  for (const m of line.matchAll(/\*\*([A-H])\*\*/gi)) {
    set.add(m[1].toUpperCase());
  }
  for (const m of line.matchAll(/\*\*([A-H])\s*:/gi)) {
    set.add(m[1].toUpperCase());
  }

  let letters = [...set];

  if (letters.length === 0) {
    const two = line.match(
      /\*\*\s*([A-H])\s+and\s+([A-H])\s*\*\*/i,
    );
    if (two) letters = [two[1].toUpperCase(), two[2].toUpperCase()];
  }

  if (letters.length === 0) {
    const colon = line.match(/correct\s+answer\s+is\s+([A-H])\s*:/i);
    if (colon) letters = [colon[1].toUpperCase()];
  }

  if (letters.length === 0) {
    const dotOnly = line.match(/correct\s+answer\s+is\s+([A-H])\.\s+/i);
    if (dotOnly) letters = [dotOnly[1].toUpperCase()];
  }

  if (letters.length === 0) {
    const after = line.replace(
      /^.*?correct\s+answers?\s+(?:is|are)\s+/i,
      '',
    ).trimStart();
    const lead = /^([A-H])\b/i.exec(after);
    if (lead) letters = [lead[1].toUpperCase()];
  }

  letters = [...new Set(letters)];
  letters.sort();
  return letters;
}

function isMultiStem(stem, correctCount) {
  if (correctCount > 1) return true;
  return (
    /\((Choose|choose|Select|select)\s+(TWO|THREE|two|three|2|3)\)|Select\s+(TWO|THREE)|two correct answers|three correct answers/i.test(
      stem,
    )
  );
}

function main() {
  const markdown = readFileSync(MD_PATH, 'utf8');
  const blocks = splitQuestionBlocks(markdown.split(/\r?\n/));

  /** @type {object[]} */
  const questions = [];
  /** @type {object[]} */
  const errors = [];

  for (let bi = 0; bi < blocks.length; bi++) {
    const blockLines = blocks[bi];
    const head = blockLines[0]?.match(/^(\d+)\.\s(.*)$/);
    const sourceNum = head ? Number(head[1]) : bi + 1;
    const firstLineStem = head ? head[2].trim() : '';

    const reportIdx = blockLines.findIndex(
      (l) => l.trim() === 'Report Content Errors',
    );
    if (reportIdx < 0) {
      continue;
    }

    const stemContinuation = blockLines.slice(1, reportIdx).join('\n').trim();
    const stemRaw = stemContinuation
      ? `${firstLineStem}\n${stemContinuation}`
      : firstLineStem;

    if (!stemRaw) {
      errors.push({ sourceNum, msg: 'Empty stem' });
      continue;
    }

    const { optionLines: optLines, answerLine } = sliceOptionLines(blockLines);
    if (!optLines || !answerLine) {
      errors.push({ sourceNum, msg: 'Missing options / answer line' });
      continue;
    }

    const options = parseOptions(optLines);
    const correctLetters = parseCorrectLetters(answerLine);

    if (options.length < 2 || correctLetters.length === 0) {
      errors.push({
        sourceNum,
        msg: `Bad options/count; opts=${options.length} correct=${correctLetters.join(',')}`,
      });
      continue;
    }

    const lettersSet = new Set(options.map((o) => o.id));
    if (!correctLetters.every((x) => lettersSet.has(x))) {
      errors.push({
        sourceNum,
        msg: `Correct ref not in options: ${correctLetters.join(',')} vs ${[...lettersSet].join('')}`,
      });
      continue;
    }

    const isMultiple = isMultiStem(stemRaw, correctLetters.length);

    questions.push({
      id: questions.length + 1,
      question: stemRaw.replace(/\s+/g, ' ').trim(),
      options,
      correctAnswers: [...correctLetters].sort(),
      isMultiple,
      topic: detectTopic(stemRaw),
    });
  }

  const bank = {
    examId: 'aws-saa-c03',
    code: 'SAA-C03',
    title: 'AWS Certified Solutions Architect – Associate',
    passThresholdPercent: 72,
    sourceNote:
      'Auto-ingested from public/aws-saa-practice-exam.md via scripts/ingest-saa-from-md.mjs (verify before trusting).',
    questions,
  };

  writeFileSync(OUT_PATH, JSON.stringify(bank));
  console.log(
    JSON.stringify({
      wrote: OUT_PATH,
      parsed: questions.length,
      blocks: blocks.length,
      errorsCount: errors.length,
    }),
  );

  if (errors.length > 0) {
    console.error('Parsing errors:', errors.slice(0, 25));
    if (errors.length > 25)
      console.error(`... plus ${errors.length - 25} more`);
    process.exitCode = 1;
  }
}

main();
