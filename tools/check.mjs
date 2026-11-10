// Re-run every contract from scratch and fail if any recorded figure differs from data/runs.json.
// The pages are written from that file, so this checks every gas figure, return value and revert they print.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { compileAll, runAll } from './compile-run.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const saved = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'runs.json'), 'utf8')).runs;
const fresh = JSON.parse(JSON.stringify(await runAll(compileAll().artifacts)));
let diffs = 0, steps = 0;
for (const [id, run] of Object.entries(fresh)) {
  run.steps.forEach((s, i) => {
    steps++;
    const a = JSON.stringify(s), b = JSON.stringify(saved[id] && saved[id].steps[i]);
    if (a !== b) { diffs++; if (diffs <= 10) console.log(`${id} step ${i + 1}:\n  now   ${a.slice(0, 200)}\n  saved ${String(b).slice(0, 200)}`); }
  });
}
console.log(diffs ? `FAIL: ${diffs} of ${steps} recorded steps differ; run npm run build` : `ok: all ${steps} recorded steps reproduce exactly`);
process.exit(diffs ? 1 : 0);
