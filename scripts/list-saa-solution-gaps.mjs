import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const md = readFileSync(resolve(root, 'public', 'saa-03-questions.md'), 'utf8');
const sol = readFileSync(resolve(root, 'public', 'AWS SAA-03 Solution.txt'), 'utf8');

const maxQ = Math.max(
  ...[...md.matchAll(/^Question #(\d+)\s+/gm)].map((m) => Number(m[1])),
);
const have = new Set(
  [...sol.matchAll(/^(\d+)\]/gm)].map((m) => Number(m[1])),
);
const missing = [];
for (let n = 1; n <= maxQ; n++) {
  if (!have.has(n)) missing.push(n);
}
console.log(
  JSON.stringify({
    maxQ,
    haveCount: have.size,
    missingCount: missing.length,
    numbers: missing,
  }),
);
