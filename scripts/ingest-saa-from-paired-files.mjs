// Merge questions from public/saa-03-questions.md + public/AWS SAA-03 Solution.txt
// into src/data/exams/aws-saa-c03.json (dedupe by normalized question text vs existing bank).
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const QUESTIONS_MD = resolve(root, 'public', 'saa-03-questions.md');
const SOLUTIONS_TXT = resolve(root, 'public', 'AWS SAA-03 Solution.txt');
const OUT_PATH = resolve(root, 'src', 'data', 'exams', 'aws-saa-c03.json');
const GAP_ANSWERS_PATH = resolve(
  root,
  'src',
  'data',
  'exams',
  'saa-c03-gap-answers.json',
);

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

function normalizeQuestionKey(s) {
  return s
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s.?()'-]/gu, '')
    .trim();
}

function expectedAnswerCount(stem) {
  if (
    /\(Choose three\.\)|\(Choose three\)|choose three\.|select three|three correct/i.test(
      stem,
    )
  )
    return 3;
  if (
    /\(Choose two\.\)|choose two\.|choose two\)|select two|two correct/i.test(stem)
  )
    return 2;
  return 1;
}

function isMultiStem(stem, correctCount) {
  if (correctCount > 1) return true;
  return (
    /\((Choose|choose|Select|select)\s+(TWO|THREE|two|three|2|3)\)|Select\s+(TWO|THREE)|two correct answers|three correct answers/i.test(
      stem,
    )
  );
}

function normalizeForMatch(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenOverlap(a, b) {
  const aw = new Set(normalizeForMatch(a).split(' ').filter((w) => w.length > 2));
  if (aw.size === 0) return 0;
  const bw = normalizeForMatch(b).split(' ').filter((w) => w.length > 2);
  let hit = 0;
  for (const w of bw) {
    if (aw.has(w)) hit += 1;
  }
  return hit / Math.max(aw.size, 1);
}

function scoreMatch(answerBlob, optionText) {
  const a = normalizeForMatch(answerBlob);
  const o = normalizeForMatch(optionText);
  if (!a || !o) return 0;
  const prefix = o.slice(0, Math.min(60, o.length));
  if (prefix.length > 15 && a.includes(prefix)) return 1;
  if (a.length > 20 && o.includes(a.slice(0, Math.min(60, a.length)))) return 1;
  return tokenOverlap(answerBlob, optionText);
}

/** @returns {{ num: number, lines: string[] }[]} */
function splitSolutionBlocks(text) {
  const lines = text.split(/\r?\n/);
  /** @type {{ num: number, lines: string[] }[]} */
  const blocks = [];
  let currentNum = null;
  /** @type {string[]} */
  let buf = [];

  for (const line of lines) {
    const m = line.match(/^(\d+)\]\s?(.*)$/);
    if (m) {
      if (currentNum !== null) blocks.push({ num: currentNum, lines: buf });
      currentNum = Number(m[1]);
      buf = m[2] !== undefined && m[2].length > 0 ? [m[2]] : [];
    } else if (currentNum !== null) {
      buf.push(line);
    }
  }
  if (currentNum !== null) blocks.push({ num: currentNum, lines: buf });
  return blocks;
}

/** @returns {Map<number, string[][]>} */
function groupSolutionLinesByNum(blocks) {
  const m = new Map();
  for (const b of blocks) {
    if (!m.has(b.num)) m.set(b.num, []);
    m.get(b.num).push(b.lines);
  }
  return m;
}

function pickSolutionLines(stem, blocksForNum) {
  if (!blocksForNum || blocksForNum.length === 0) return null;
  if (blocksForNum.length === 1) return blocksForNum[0];

  const nStem = normalizeForMatch(stem);
  let best = blocksForNum[0];
  let bestScore = -1;
  for (const bl of blocksForNum) {
    const head = bl.slice(0, 20).join(' ');
    const score = tokenOverlap(nStem, head);
    if (score > bestScore) {
      bestScore = score;
      best = bl;
    }
  }
  return best;
}

/** @returns {{ stem: string, options: { id: string, text: string }[], rawNum: number } | null } */
function parseQuestionBlock(rawNum, bodyLines) {
  const optStart = bodyLines.findIndex((l) => /^([A-H])\.\s*$|^([A-H])\.\s+\S/.test(l.trim()));
  if (optStart < 0) return null;

  const stemLines = bodyLines.slice(0, optStart);
  const stemRaw = stemLines.join('\n').trim().replace(/\s+/g, ' ').trim();
  if (!stemRaw) return null;

  /** @type { { id: string, textChunks: string[] }[] } */
  const parsed = [];
  let i = optStart;
  while (i < bodyLines.length) {
    const trimmed = bodyLines[i].trim();
    const om = trimmed.match(/^([A-H])\.\s*(.*)$/);
    if (!om) break;
    const id = om[1];
    const chunks = [om[2].trim()].filter(Boolean);
    i += 1;
    while (i < bodyLines.length) {
      const t = bodyLines[i].trim();
      if (/^([A-H])\.\s*$|^([A-H])\.\s+\S/.test(t)) break;
      if (t !== '') chunks.push(t);
      i += 1;
    }
    const text = chunks.join(' ').replace(/\s+/g, ' ').trim();
    if (text) parsed.push({ id, textChunks: chunks });
  }

  const seen = new Set();
  const options = [];
  for (const { id, textChunks } of parsed) {
    const text = textChunks.join(' ').replace(/\s+/g, ' ').trim();
    if (!/^[A-H]$/.test(id) || seen.has(id) || !text) continue;
    seen.add(id);
    options.push({ id, text });
  }

  return { stem: stemRaw, options, rawNum };
}

/** @returns {{ rawNum: number, stem: string, options: { id: string, text: string }[] }[]} */
function parseQuestionsMd(text) {
  const lines = text.split(/\r?\n/);
  /** @type { { rawNum: number, body: string[] }[] } */
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const m = lines[i].match(/^Question #(\d+)\s+/);
    if (!m) {
      i += 1;
      continue;
    }
    const rawNum = Number(m[1]);
    i += 1;
    const body = [];
    while (i < lines.length && !/^Question #\d+\s+/.test(lines[i])) {
      body.push(lines[i]);
      i += 1;
    }
    blocks.push({ rawNum, body });
  }

  const out = [];
  for (const { rawNum, body } of blocks) {
    const parsed = parseQuestionBlock(rawNum, body);
    if (parsed) out.push(parsed);
  }
  return out;
}

function pickOptionsByTextMatch(blob, options, expectedCount) {
  const want = Math.max(expectedCount, 1);
  const scored = options
    .map((o) => ({ id: o.id, score: scoreMatch(blob, o.text) }))
    .sort((a, b) => b.score - a.score);

  const strong = scored.filter((s) => s.score >= 0.28);
  let pick = strong.slice(0, want);
  if (pick.length < want) {
    pick = scored.slice(0, want).filter((s) => s.score >= 0.12);
  }
  if (pick.length === 0 && scored[0]?.score > 0) pick = [scored[0]];
  return [...new Set(pick.map((p) => p.id))].sort();
}

/**
 * @param {string} stem
 * @param {string[]} solLines
 * @param {{ id: string, text: string }[]} options
 * @param {number} expectedCount
 */
function extractCorrectLetters(stem, solLines, options, expectedCount) {
  const optionIds = new Set(options.map((o) => o.id));
  const text = solLines.join('\n');
  /** @type {Set<string>} */
  const found = new Set();

  const answerHeaderLine = solLines.find((l) => /^\s*answers?:\s*/i.test(l));
  if (answerHeaderLine) {
    const seg = answerHeaderLine.replace(/^\s*answers?:\s*/i, '');
    for (const m of seg.matchAll(/\b([A-H])\s*\)/gi)) {
      const L = m[1].toUpperCase();
      if (optionIds.has(L)) found.add(L);
    }
  }

  for (const m of text.matchAll(/\banswers?:\s*[^\n]*/gi)) {
    const seg = m[0];
    for (const x of seg.matchAll(/\b([A-H])\s*\)/gi)) {
      const L = x[1].toUpperCase();
      if (optionIds.has(L)) found.add(L);
    }
  }

  for (const line of solLines) {
    if (/^\s*ans-/i.test(line)) {
      const rest = line.replace(/^\s*ans-\s*/, '').trim();
      const dot = rest.match(/^([A-H])[.)]\s/i);
      if (dot && optionIds.has(dot[1])) found.add(dot[1].toUpperCase());
      const paren = rest.match(/^([A-H])\s*\)/);
      if (paren && optionIds.has(paren[1])) found.add(paren[1].toUpperCase());
    }
  }

  for (const line of solLines.slice(0, 55)) {
    const t = line.trim();
    const m1 = t.match(/^([A-H])\.\s+\S/);
    const m2 = t.match(/^([A-H])\s*\)\s*\S/);
    const m3 = t.match(/^([A-H])\s+[A-Za-z]/);
    for (const m of [m1, m2]) {
      if (m && optionIds.has(m[1])) found.add(m[1].toUpperCase());
    }
    if (m3 && optionIds.has(m3[1]) && !/^[A-H]\.\s/.test(t)) {
      const rest = t.slice(2).trim();
      if (/^[A-Z]/.test(rest)) found.add(m3[1].toUpperCase());
    }
  }

  for (const m of text.matchAll(/correct\s+answers?\s*[A-H]?:\s*([A-H])\b/gi)) {
    const L = m[1].toUpperCase();
    if (optionIds.has(L)) found.add(L);
  }
  for (const m of text.matchAll(/\bcorrect\s+answer\s+is\s+([A-H])\b/gi)) {
    const L = m[1].toUpperCase();
    if (optionIds.has(L)) found.add(L);
  }

  let letters = [...found].filter((l) => optionIds.has(l)).sort();

  if (letters.length >= expectedCount && expectedCount > 1) {
    return letters.slice(0, expectedCount);
  }
  if (letters.length === 1 && expectedCount <= 1) return letters;
  if (letters.length >= expectedCount && expectedCount <= 1 && letters.length > 0) {
    return [letters[0]];
  }

  /** @type {string[]} */
  let answerBlob = '';
  const ansLine = solLines.find((l) => /^\s*ans-/i.test(l.trim()));
  if (ansLine) answerBlob = ansLine.replace(/^\s*ans-\s*/i, '').trim();

  if (!answerBlob && answerHeaderLine) {
    answerBlob = answerHeaderLine.replace(/^\s*answers?:\s*/i, '').trim();
  }

  if (!answerBlob) {
    const ah = text.match(/answers?:\s*([^\n]+)/i);
    if (ah) answerBlob = ah[1].trim();
  }

  if (!answerBlob) {
    const firstOpt = solLines.find((l) => {
      const t = l.trim();
      return (
        /^([A-H])\.\s+\S/.test(t) ||
        /^([A-H])\s*\)\s*\S/.test(t) ||
        /^\s*([A-H])\s+[A-Z]/.test(t)
      );
    });
    if (firstOpt) {
      answerBlob = firstOpt.replace(/^([A-H])[.)]\s*/i, '').trim();
      answerBlob = answerBlob.replace(/^([A-H])\s*\)\s*/, '').trim();
    }
  }

  if (answerBlob) {
    const picked = pickOptionsByTextMatch(answerBlob, options, expectedCount);
    if (picked.length > 0) return picked;
  }

  const head = solLines
    .filter((l) => l.trim() && !/^-+$/g.test(l.trim()))
    .slice(0, 12)
    .join(' ');
  let picked2 = pickOptionsByTextMatch(head, options, expectedCount);
  if (picked2.length > 0) return picked2;

  const stemPick = pickOptionsByTextMatch(stem, options, expectedCount);
  return stemPick;
}

/** When the solution file has no usable answer for a numbered question, use these letters (verified against the MD option set). */
const ANSWER_OVERRIDES = {
  247: ['C', 'E'],
  390: ['B', 'D'],
  423: ['A', 'B'],
  599: ['A', 'C', 'F'],
};

/** Gap answers when solution file has no `NN]` block — see saa-c03-gap-answers.json */
function loadGapAnswers() {
  try {
    const raw = readFileSync(GAP_ANSWERS_PATH, 'utf8');
    const data = JSON.parse(raw);
    /** @type {Record<string, string[]>} */
    const out = {};
    for (const [k, v] of Object.entries(data)) {
      if (k.startsWith('_')) continue;
      if (Array.isArray(v) && v.every((x) => typeof x === 'string')) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

function main() {
  const md = readFileSync(QUESTIONS_MD, 'utf8');
  const solTxt = readFileSync(SOLUTIONS_TXT, 'utf8');
  const gapAnswers = loadGapAnswers();

  const parsedQs = parseQuestionsMd(md);
  const solBlocks = splitSolutionBlocks(solTxt);
  const byNum = groupSolutionLinesByNum(solBlocks);

  const existingRaw = readFileSync(OUT_PATH, 'utf8');
  const bank = JSON.parse(existingRaw);

  /** @type {Set<string>} */
  const seenKeys = new Set(
    bank.questions.map((q) => normalizeQuestionKey(q.question)),
  );

  /** @type {object[]} */
  const newItems = [];
  /** @type {object[]} */
  const ingestErrors = [];

  for (const q of parsedQs) {
    const exp = expectedAnswerCount(q.stem);
    const candidateBlocks = byNum.get(q.rawNum);
    const solLines = pickSolutionLines(q.stem, candidateBlocks);
    const gapKey = String(q.rawNum);
    const gapLetters = gapAnswers[gapKey];

    if (!solLines && (!gapLetters || gapLetters.length === 0)) {
      ingestErrors.push({
        sourceNum: q.rawNum,
        msg: 'No solution block for this question number',
      });
      continue;
    }

    if (q.options.length < 2) {
      ingestErrors.push({
        sourceNum: q.rawNum,
        msg: `Too few options: ${q.options.length} (incomplete or placeholder options in source MD)`,
      });
      continue;
    }

    /** @type {string[]} */
    let correctLetters = [];
    const override = ANSWER_OVERRIDES[q.rawNum];
    if (override) {
      correctLetters = [...override];
    } else if (!solLines && gapLetters) {
      correctLetters = [...gapLetters];
    } else if (solLines) {
      correctLetters = extractCorrectLetters(q.stem, solLines, q.options, exp);
    } else {
      correctLetters = [];
    }

    if (correctLetters.length === 0) {
      ingestErrors.push({
        sourceNum: q.rawNum,
        msg: 'Could not determine correct answer(s)',
      });
      continue;
    }

    const lettersSet = new Set(q.options.map((o) => o.id));
    if (!correctLetters.every((x) => lettersSet.has(x))) {
      ingestErrors.push({
        sourceNum: q.rawNum,
        msg: `Correct ref not in options: ${correctLetters.join(',')}`,
      });
      continue;
    }

    if (exp > 1 && correctLetters.length < exp) {
      ingestErrors.push({
        sourceNum: q.rawNum,
        msg: `Expected ${exp} answers, got ${correctLetters.length}`,
      });
      continue;
    }

    const questionText = q.stem.trim();
    const key = normalizeQuestionKey(questionText);
    if (seenKeys.has(key)) {
      continue;
    }
    seenKeys.add(key);

    newItems.push({
      question: questionText,
      options: q.options,
      correctAnswers: [...correctLetters].sort(),
      isMultiple: isMultiStem(q.stem, correctLetters.length),
      topic: detectTopic(q.stem),
      _sourceNum: q.rawNum,
    });
  }

  const merged = [
    ...bank.questions,
    ...newItems.map(({ _sourceNum: _sn, ...rest }) => rest),
  ];

  const reindexed = merged.map((q, idx) => ({
    ...q,
    id: idx + 1,
  }));

  bank.questions = reindexed;
  bank.sourceNote =
    'Merged from public/saa-03-questions.md + public/AWS SAA-03 Solution.txt + src/data/exams/saa-c03-gap-answers.json via scripts/ingest-saa-from-paired-files.mjs (verify before trusting).';

  writeFileSync(OUT_PATH, JSON.stringify(bank));

  const skippedDedupedAgainstBank = parsedQs.length - ingestErrors.length - newItems.length;

  const stats = {
    wrote: OUT_PATH,
    parsedQuestionsMd: parsedQs.length,
    solutionBlocks: solBlocks.length,
    appendedAfterDedupe: newItems.length,
    ingestErrors: ingestErrors.length,
    skippedDedupedAgainstBank,
  };

  console.log(JSON.stringify(stats, null, 2));
  console.log(
    JSON.stringify({
      appendedSampleSourceNums: newItems.slice(0, 5).map((x) => x._sourceNum),
    }),
  );

  if (ingestErrors.length > 0) {
    /** @type {Map<string, number>} */
    const byMsg = new Map();
    for (const e of ingestErrors) {
      byMsg.set(e.msg, (byMsg.get(e.msg) ?? 0) + 1);
    }
    console.error('Error summary:', JSON.stringify(Object.fromEntries(byMsg), null, 2));
    console.error(
      'Ingest errors (first 25):',
      JSON.stringify(ingestErrors.slice(0, 25), null, 2),
    );
    if (ingestErrors.length > 25) {
      console.error(`... plus ${ingestErrors.length - 25} more`);
    }
    const critical = ingestErrors.filter(
      (e) =>
        !e.msg.includes('No solution block for this question number') &&
        !e.msg.includes('incomplete or placeholder options in source MD'),
    );
    if (critical.length > 0) {
      console.error('Critical errors:', JSON.stringify(critical, null, 2));
    }
    process.exitCode = critical.length > 0 ? 1 : 0;
  }
}

main();
