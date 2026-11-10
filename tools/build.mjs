// Build the whole site: compile + run every contract, then write every page from the recorded runs.
//   cd tools && npm ci && npm run build
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as esbuild from 'esbuild';
import { compileAll, runAll } from './compile-run.mjs';
import { PAGES, EXAMPLES, TERMS, n } from './content.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Browser bundle of the same chain code (built first so pages can state its size).
await esbuild.build({
  entryPoints: [path.join(ROOT, 'tools', 'browser-entry.mjs')],
  bundle: true, format: 'esm', platform: 'browser', minify: true, legalComments: 'none',
  inject: [path.join(ROOT, 'tools', 'buffer-shim.mjs')], define: { global: 'globalThis' },
  outfile: path.join(ROOT, 'assets', 'js', 'chain.bundle.js'), logLevel: 'warning',
});
const BUNDLE_KB = Math.round(fs.statSync(path.join(ROOT, 'assets', 'js', 'chain.bundle.js')).size / 1024);
const compiled = compileAll();
const runs = await runAll(compiled.artifacts);
const SOLC = compiled.compiler.split('+')[0];
const allSteps = Object.values(runs).flatMap((r) => r.steps);
const TOTALS = {
  contracts: Object.keys(compiled.artifacts).length,
  files: compiled.files,
  tx: Object.values(runs).reduce((n, r) => n + r.sent, 0),
  listed: allSteps.filter((s) => s.kind === 'tx' || s.kind === 'deploy').length,
  reverts: allSteps.filter((s) => s.ok === false).length,
  scenarios: Object.keys(runs).length,
};

fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'data', 'runs.json'), JSON.stringify({ compiler: compiled.compiler, evm: 'cancun', totals: TOTALS, runs }, null, 1));
// Only what the in-browser runner needs.
const PLAY = ['Counter', 'Guarded', 'PiggyBank', 'VotingSystem', 'PetAdoption', 'PaymentForWork', 'PaymentForWorkFixed'];
const playArtifacts = Object.fromEntries(PLAY.map((k) => [k, { abi: compiled.artifacts[k].abi, bytecode: compiled.artifacts[k].bytecode, file: compiled.artifacts[k].file }]));
fs.writeFileSync(path.join(ROOT, 'data', 'playground.json'), JSON.stringify({ compiler: compiled.compiler, artifacts: playArtifacts }));

// ---------- Solidity highlighting (build time, no client JS) ----------
const KW = /\b(pragma|solidity|contract|interface|abstract|library|is|function|modifier|event|error|struct|mapping|returns|return|public|private|internal|external|view|pure|payable|memory|storage|calldata|immutable|constant|override|virtual|emit|revert|require|if|else|for|while|unchecked|new|constructor|receive|fallback|using)\b/g;
const TY = /\b(uint\d*|int\d*|address|bool|string|bytes\d*)\b/g;
function highlight(src) {
  const out = [];
  for (const line of src.split('\n')) {
    const ci = line.indexOf('//');
    const code = ci >= 0 ? line.slice(0, ci) : line;
    const comment = ci >= 0 ? line.slice(ci) : '';
    let h = esc(code)
      .replace(/(&quot;[^&]*?&quot;|"[^"]*")/g, '<span class="s">$1</span>')
      .replace(KW, '<span class="k">$1</span>')
      .replace(TY, '<span class="t">$1</span>')
      .replace(/\b(\d[\d_]*)\b/g, '<span class="n">$1</span>');
    const lead = (line.match(/^ */) || [''])[0].length;
    const body = h.replace(/^ +/, '') + (comment ? `<span class="c">${esc(comment)}</span>` : '');
    out.push(`<span class="ln" style="--i:${lead}">${body || ' '}</span>`);
  }
  return out.join('');
}
const source = (file) => fs.readFileSync(path.join(ROOT, 'contracts', file), 'utf8').replace(/^\/\/ SPDX[^\n]*\n/, '').trim();

// ---------- trace table: the recorded run ----------
const txMax = (rs) => Math.max(...rs.flatMap((r) => r.steps).filter((s) => s.kind === 'tx' && s.gas).map((s) => s.gas));
function trace(run, { caption, max = txMax([run]) } = {}) {
  const rows = run.steps.map((s) => {
    if (s.kind === 'setup') return `<tr class="k-setup"><td class="note" colspan="5">${esc(s.note)} · <b>${s.count}</b> transactions</td></tr>`;
    const who = s.kind === 'deploy' ? `${s.from} deploys` : s.kind === 'tx' ? `${s.from} →` : s.kind === 'read' ? 'read' : 'balance';
    const call = s.kind === 'balance' ? esc(s.to) : `${s.kind === 'deploy' ? '' : `<span class="to">${esc(s.to)}.</span>`}${esc(s.call)}`;
    const value = s.valueText && s.kind !== 'balance' ? ` <span class="val">+${esc(s.valueText)}</span>` : '';
    let result;
    if (s.ok === false) result = `<span class="rev">reverted: ${esc(s.error.text)}</span>`;
    else if (s.kind === 'deploy') result = '<span class="okc">deployed</span>';
    else if (s.returns != null) result = `<span class="ret">${esc(s.returns)}</span>`;
    else result = '<span class="okc">ok</span>';
    const ev = s.events && s.events.length ? `<span class="ev">${s.events.map(esc).join('<br>')}</span>` : '';
    const gas = s.gas == null ? '' : s.kind === 'tx'
      ? `<span class="track" aria-hidden="true"><span class="bar${s.ok === false ? ' bar--rev' : ''}" style="--w:${((s.gas / max) * 100).toFixed(1)}%"></span></span><span class="g">${n(s.gas)}</span>`
      : s.kind === 'deploy' ? `<span class="g">${n(s.gas)}</span>`
      : `<span class="g g--exec" title="execution gas of a read-only call; no transaction, nobody pays">${n(s.gas)}*</span>`;
    return `<tr class="${s.ok === false ? 'is-rev' : ''} k-${s.kind}">
      <td class="note">${s.note && !s.note.startsWith('deploy ') ? esc(s.note) : ''}</td>
      <td class="who">${esc(who)}</td>
      <td class="call"><code>${call}</code>${value}</td>
      <td class="res">${result}${ev}</td>
      <td class="gas">${gas}</td></tr>`;
  });
  return `<figure class="trace"><figcaption>${caption || 'What happened when it ran'} <span class="muted">· bars: transaction gas on one scale for every table on this page, zero to ${n(max)}; deploys as numbers only${run.steps.some((s) => s.kind === 'read' && s.gas) ? ' · * read-only call: execution gas, not paid' : ''}</span></figcaption>
  <div class="trace-wrap"><table><thead><tr><th scope="col">step</th><th scope="col">who</th><th scope="col">call</th><th scope="col">result</th><th scope="col">gas</th></tr></thead><tbody>${rows.join('')}</tbody></table></div></figure>`;
}

function codeBlock(file, label) {
  return `<figure class="code"><figcaption><code>contracts/${esc(file)}</code>${label ? ' · ' + label : ''}</figcaption><pre><code>${highlight(source(file))}</code></pre></figure>`;
}

// ---------- page shell ----------
const NAV = [
  ['index.html', 'Home'], ['basics.html', 'Basics'], ['advanced.html', 'Advanced'], ['security.html', 'Security'],
  ['examples.html', 'Examples'], ['playground.html', 'Run it'], ['resources.html', 'Resources'], ['about.html', 'About'],
];
function page(file, { title, desc, body, current, scripts = '' }) {
  const nav = NAV.map(([h, t]) => `<a href="${h}"${h === current ? ' aria-current="page"' : ''}>${t}</a>`).join('');
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="assets/img/card.png">
<link rel="icon" href="assets/img/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,800&family=JetBrains+Mono:wght@400;600&family=Source+Sans+3:wght@400;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/site.css">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="mast">
  <a class="brand" href="index.html"><span aria-hidden="true">◆</span> Learn Solidity</a>
  <nav aria-label="Site">${nav}</nav>
</header>
<main id="main">
${body}
</main>
<footer class="foot">
  <p>Every contract on this site was compiled with solc ${esc(SOLC)} and run in an in-memory EVM (EthereumJS, Cancun rules) when the site was built: ${TOTALS.files} source files, ${TOTALS.contracts} contracts, ${n(TOTALS.tx)} transactions (${TOTALS.listed} listed on these pages; the rest are setup calls such as members joining, counted where they happen), ${TOTALS.reverts} reverted on purpose. Run <code>cd tools &amp;&amp; npm ci &amp;&amp; npm run build</code> to reproduce every number. Nothing here is financial or security-audit advice.</p>
  <p>Free and open source, MIT licence. <a href="https://github.com/SolutionsAsService/LearnSolidity">Source on GitHub</a>.</p>
</footer>
${scripts}
</body>
</html>
`;
  fs.writeFileSync(path.join(ROOT, file), html);
}

// ---------- lesson pages ----------
function termBox(keys) {
  if (!keys || !keys.length) return '';
  return `<aside class="terms" aria-label="Terms used here"><h3>Terms</h3><dl>${keys.map((k) => `<dt>${esc(k)}</dt><dd>${esc(TERMS[k])}</dd>`).join('')}</dl></aside>`;
}
function lessonPage(key, file) {
  const p = PAGES[key];
  const pageMax = txMax(p.lessons.map((l) => runs[l.id]));
  const toc = p.lessons.map((l) => `<li><a href="#${l.id}">${esc(runs[l.id].title)}</a></li>`).join('');
  const body = `<div class="page-head"><p class="kicker">${esc(p.title)}</p><h1>${esc(p.h1)}</h1><p class="lede">${esc(p.lede)}</p><ol class="toc">${toc}</ol></div>
${p.lessons.map((l, i) => {
    const r = runs[l.id];
    return `<section class="lesson" id="${l.id}" aria-labelledby="h-${l.id}">
  <h2 id="h-${l.id}"><span class="num">${String(i + 1).padStart(2, '0')}</span> ${esc(r.title)}</h2>
  <div class="lesson-grid">
    <div class="prose"><p>${l.intro(r.steps)}</p>${termBox(l.terms)}</div>
    ${codeBlock(r.file)}
  </div>
  ${trace(r, { max: pageMax })}
  ${l.chart === 'reentry' ? reentryChart(r) : ''}
  <p class="after"><strong>What it shows.</strong> ${l.after(r.steps)}</p>
</section>`;
  }).join('\n')}`;
  page(file, { title: `${p.title} · Learn Solidity`, desc: p.lede, body, current: file });
}

// ---------- examples ----------
function examplePage(key) {
  const e = EXAMPLES[key];
  const r = runs[key];
  const fixed = key === 'payment' ? runs.paymentfixed : null;
  const max = txMax(fixed ? [r, fixed] : [r]);
  const body = `<div class="page-head"><p class="kicker"><a href="examples.html">Examples</a></p><h1>${esc(e.title)}</h1><p class="lede">${esc(e.lede)}</p>
<p><a class="btn btn--ghost" href="playground.html?c=${encodeURIComponent(r.file.split('/')[1].replace('.sol', ''))}">Run it yourself <span class="muted">(${BUNDLE_KB} KB download)</span></a></p></div>
<section class="lesson" aria-labelledby="h-run"><h2 id="h-run">What happened when it ran</h2>${trace(r, { max, caption: 'The run' })}<p class="after"><strong>What it shows.</strong> ${e.after(r.steps)}</p>${termBox(['transaction', 'revert', 'event'])}</section>
${fixed ? owedChart() : ''}
<section class="lesson" aria-labelledby="h-src"><h2 id="h-src">The contract</h2>${codeBlock(r.file, 'as in the original repository')}</section>
${fixed ? `<section class="lesson" aria-labelledby="h-fix"><h2 id="h-fix">The fix</h2>${codeBlock(fixed.file, 'one new variable: totalOwed')}${trace(fixed, { max, caption: 'The same run against the fixed contract' })}<p class="after"><strong>What it shows.</strong> ${e.fixed(fixed.steps)}</p></section>` : ''}`;
  page(`example-${key}.html`, { title: `${e.title} · Examples · Learn Solidity`, desc: e.lede, body, current: 'examples.html' });
}

// The bank's balance at each re-entry, read from the attacker's Reentered events.
function reentryChart(run) {
  const atk = run.steps.find((s) => s.note === 'Mallory attacks with 1 ETH');
  const ev = atk.eventsRaw.filter((e) => e.name === 'Reentered').map((e) => ({ d: +e.args[0], bal: Number(BigInt(e.args[1])) / 1e18 }));
  const after = Number(BigInt(run.steps.filter((s) => s.kind === 'balance')[1].wei)) / 1e18;
  const pts = [...ev, { d: ev.length + 1, bal: after, end: true }];
  const top = Math.max(...pts.map((p) => p.bal));
  const W = 640, H = 210, L = 46, B = 30, T = 24, bw = (W - L - 8) / pts.length;
  const y = (v) => H - B - (v / top) * (H - B - T);
  const bars = pts.map((p, i) => `<rect x="${(L + i * bw + 3).toFixed(1)}" y="${y(p.bal).toFixed(1)}" width="${(bw - 6).toFixed(1)}" height="${(y(0) - y(p.bal)).toFixed(1)}" class="c-held"/><text x="${(L + i * bw + bw / 2).toFixed(1)}" y="${(y(p.bal) - 5).toFixed(1)}" text-anchor="middle" class="c-lab">${p.bal}</text><text x="${(L + i * bw + bw / 2).toFixed(1)}" y="${H - B + 14}" text-anchor="middle" class="c-lab">${p.end ? 'after' : p.d}</text>`).join('');
  const grid = [0, top / 2, top].map((v) => `<line x1="${L}" x2="${W - 8}" y1="${y(v)}" y2="${y(v)}" class="c-grid"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end" class="c-lab">${v} ETH</text>`).join('');
  return `<figure class="owed"><svg viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="re-t re-d"><title id="re-t">What the bank held at each re-entry, inside one transaction</title><desc id="re-d">${pts.map((p) => `${p.end ? 'after the transaction' : 're-entry ' + p.d}: ${p.bal} ETH`).join('; ')}.</desc>${grid}${bars}</svg>
<figcaption>Inside Mallory’s one transaction: what <code>VulnerableBank</code> held each time the attacker re-entered <code>withdraw()</code> (from ${ev.length} <code>Reentered</code> events), then after it finished.</figcaption></figure>`;
}

// Deposited vs promised, per step of the PaymentForWork run (Tufte F5 in R0).
function owedChart() {
  const pts = runs.payment.steps.filter((s) => s.kind === 'tx' && s.state).map((s) => ({ s, held: Number(BigInt(s.state.held)) / 1e18, owed: Number(BigInt(s.state.owed)) / 1e18 }));
  const max = Math.max(...pts.map((p) => Math.max(p.held, p.owed)));
  const W = 640, H = 220, L = 46, B = 34, T = 18;
  const x = (i) => L + (i + 0.5) * ((W - L - 8) / pts.length);
  const y = (v) => H - B - (v / max) * (H - B - T);
  const bw = ((W - L - 8) / pts.length) * 0.32;
  const bars = pts.map((p, i) => `<rect x="${(x(i) - bw - 1).toFixed(1)}" y="${y(p.held).toFixed(1)}" width="${bw.toFixed(1)}" height="${(y(0) - y(p.held)).toFixed(1)}" class="c-held"/><rect x="${(x(i) + 1).toFixed(1)}" y="${y(p.owed).toFixed(1)}" width="${bw.toFixed(1)}" height="${(y(0) - y(p.owed)).toFixed(1)}" class="c-owed"/>${p.owed > p.held ? `<text x="${x(i).toFixed(1)}" y="${(y(p.owed) - 5).toFixed(1)}" class="c-gap" text-anchor="middle">short ${+(p.owed - p.held).toFixed(6)}</text>` : ''}<text x="${x(i).toFixed(1)}" y="${H - B + 14}" text-anchor="middle" class="c-lab">${i + 1}</text>`).join('');
  const lastHeld = pts.length - 1;
  const hi = pts.findIndex((p) => p.held > 0), oi = pts.findIndex((p) => p.owed > 0 && p.held === 0);
  const labels = `<text x="${(x(hi) - bw / 2 - 1).toFixed(1)}" y="${(y(pts[hi].held) - 8).toFixed(1)}" class="c-key" text-anchor="middle">held</text><text x="${(x(oi) + 1 + bw / 2).toFixed(1)}" y="${(y(pts[oi].owed) - 22).toFixed(1)}" class="c-key" text-anchor="middle">promised</text>`;
  const legend = pts.map((p, i) => `<li><b>${i + 1}</b> ${esc(p.s.from)}: ${esc(p.s.call)}${p.s.ok === false ? ' <span class="rev">(reverted)</span>' : ''} · held ${p.held}, promised ${p.owed}</li>`).join('');
  const grid = [0, max / 2, max].map((v) => `<line x1="${L}" x2="${W - 8}" y1="${y(v)}" y2="${y(v)}" class="c-grid"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end" class="c-lab">${v} ETH</text>`).join('');
  const desc = pts.map((p, i) => `step ${i + 1}: held ${p.held} ETH, promised ${p.owed} ETH`).join('; ');
  return `<section class="lesson" aria-labelledby="h-owed"><h2 id="h-owed">Held against promised</h2>
<figure class="owed"><svg viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="owed-t owed-d"><title id="owed-t">Ether the contract holds against ether it has promised, after each transaction</title><desc id="owed-d">${desc}.</desc>${grid}${bars}${labels}</svg>
<figcaption><svg class="key" viewBox="0 0 12 12" aria-hidden="true"><rect width="12" height="12" class="c-held"/></svg>held by the contract (its ether balance) <svg class="key" viewBox="0 0 12 12" aria-hidden="true"><rect width="12" height="12" class="c-owed"/></svg>promised to workers (the sum of their recorded balances), read from the chain after each transaction.</figcaption>
<ol class="steps-legend">${legend}</ol></figure></section>`;
}

// ---------- landing ----------
function landing() {
  const pick = (id, note) => ({ run: runs[id], s: runs[id].steps.find((x) => x.note === note) });
  const rows = [
    { topic: 'Basics', href: 'basics.html#counter', ...pick('counter', 'first write: 0 → 1'), say: `first write ${n(pick('counter', 'first write: 0 → 1').s.gas)} gas, the next ${n(pick('counter', 'second write: 1 → 2').s.gas)}` },
    { topic: 'Advanced', href: 'advanced.html#packing', ...pick('packing', 'one slot'), say: `three fields in one slot: ${n(pick('packing', 'one slot').s.gas)} gas, not ${n(pick('packing', 'three slots').s.gas)}` },
    { topic: 'Security', href: 'security.html#reentrancy', ...pick('reentrancy', 'Mallory attacks with 1 ETH'), say: `succeeded: re-entered ${runs.reentrancy.steps.find((x) => x.call === 'reentries()').returns} times, bank emptied` },
    { topic: 'Examples', href: 'example-payment.html', ...pick('payment', 'Carol withdraws: nothing left'), say: `reverted: promised ${Number(BigInt(pick('payment', 'Carol withdraws: nothing left').s.state.owed)) / 1e18} ETH the contract no longer has`, hot: true },
  ];
  const max = Math.max(...rows.map((r) => r.s.gas));
  const tr = rows.map((r, i) => `<li class="tx${r.hot ? ' tx--hot' : ''}${r.s.ok === false ? ' tx--rev' : ''}"><a href="${r.href}" aria-label="${r.topic}: ${esc(r.say)}, ${n(r.s.gas)} gas">
    <span class="tx-n">${i + 1}</span><span class="tx-topic">${r.topic}</span>
    <span class="tx-call"><b>${esc(r.s.from)}</b> → <code>${esc(r.s.to)}.${esc(r.s.call)}</code>${r.s.valueText ? ` <span class="val">+${esc(r.s.valueText)}</span>` : ''}</span>
    <span class="tx-res">${esc(r.say)}&nbsp;<span class="go" aria-hidden="true">→</span></span>
    <span class="tx-gas"><span class="track" aria-hidden="true"><span class="bar${r.s.ok === false ? ' bar--rev' : ''}" style="--w:${((r.s.gas / max) * 100).toFixed(1)}%"></span></span><span class="g">${n(r.s.gas)}</span></span></a></li>`).join('');
  const body = `<section class="hero" aria-labelledby="h-hero">
  <div class="hero-text">
    <h1 id="h-hero">Solidity you can watch run.</h1>
    <p class="lede">${TOTALS.contracts} small contracts, compiled and run on a real Ethereum Virtual Machine: what each one cost in gas, and every one refused and undone. The red one is a bug from this site’s own examples.</p>
  </div>
  <figure class="block" aria-labelledby="block-cap">
    <figcaption id="block-cap"><span>One transaction from each part of the site</span><span class="muted">gas<span class="wide-only">, one scale from zero</span></span></figcaption>
    <ol class="txs">${tr}
      <li class="tx tx--you"><a href="playground.html" aria-label="Run it: send your own transactions in your browser, ${BUNDLE_KB} KB download"><span class="tx-n">5</span><span class="tx-topic">Run it</span><span class="tx-call"><b>You</b> → any of ${PLAY.length} contracts</span><span class="tx-res">your transaction, in your browser&nbsp;<span class="go" aria-hidden="true">→</span></span><span class="tx-gas"><span class="g">${BUNDLE_KB} KB download</span></span></a></li>
    </ol>
  </figure>
</section>
<section class="band" aria-labelledby="h-path"><h2 id="h-path">Three levels, then three complete contracts</h2>
<ol class="path">
  <li><a href="basics.html"><b>Basics</b><span>State, calls, require, ether. ${PAGES.basics.lessons.length} contracts.</span></a></li>
  <li><a href="advanced.html"><b>Advanced</b><span>Where gas goes: errors, packing, inheritance, loops. ${PAGES.advanced.lessons.length} contracts.</span></a></li>
  <li><a href="security.html"><b>Security</b><span>Reentrancy, overflow, tx.origin, unbounded loops: each run, then run again against the fix.</span></a></li>
  <li><a href="examples.html"><b>Examples</b><span>Three complete contracts, one with a money bug.</span></a></li>
</ol></section>
<section class="band" aria-labelledby="h-learned"><h2 id="h-learned">Things the runs taught us</h2>
<ul class="facts">
  <li><b>Refusing costs gas.</b> A reverted call still charged its sender ${n(runs.guarded.steps.find((s) => s.note === 'not the owner').gas)} gas. <a href="basics.html#guarded">See it</a></li>
  <li><b>A popular trick stopped working.</b> <code>unchecked { ++i; }</code> in a loop now costs ${n(runs.loops.steps.find((s) => s.note === 'unchecked, n = 1000').gas - runs.loops.steps.find((s) => s.note === 'checked, n = 1000').gas)} gas more over 1,000 iterations, not less. <a href="advanced.html#loops">See it</a></li>
  <li><b>The textbook reentrancy example no longer drains under 0.8.</b> It reverts on underflow, which hides the bug. <a href="security.html#reentrancy">See one that does</a></li>
</ul></section>`;
  page('index.html', { title: 'Learn Solidity: contracts you can watch run', desc: `Learn Solidity from ${TOTALS.contracts} contracts that were compiled and run: gas, events and reverts for every transaction, and a playground that runs them in your browser.`, body, current: 'index.html' });
}

function examplesHub() {
  const cards = Object.values(EXAMPLES).map((e) => {
    const r = runs[e.id];
    const tx = r.steps.filter((s) => s.kind === 'tx');
    const rev = tx.filter((s) => s.ok === false).length;
    return `<li><a href="example-${e.id}.html"><b>${esc(e.title)}</b><span>${esc(e.lede)}</span><span class="muted">${tx.length} transactions in the run, ${rev} reverted</span></a></li>`;
  }).join('');
  const body = `<div class="page-head"><p class="kicker">Examples</p><h1>Three complete contracts</h1><p class="lede">The contracts from this site’s original repository, unchanged, each run through a short story. One of them has a bug that only shows when it runs.</p></div><ol class="path path--ex">${cards}</ol>`;
  page('examples.html', { title: 'Examples · Learn Solidity', desc: 'Three complete Solidity contracts run through a short story each: voting, pet adoption and payment for work.', body, current: 'examples.html' });
}

function playground() {
  const opts = PLAY.map((k) => `<option value="${k}">${k}</option>`).join('');
  const body = `<div class="page-head"><p class="kicker">Run it</p><h1>Run the contracts yourself</h1>
<p class="lede">A fresh chain runs in this page: five accounts with 1,000 test ether each, and the contracts from this site, precompiled. Pick who you are and call any function. Nothing leaves your browser and the ether is not real. The EVM is a download of ${BUNDLE_KB} KB.</p></div>
<section class="play" aria-label="Playground">
  <div class="play-controls">
    <label>Contract <select id="pg-contract">${opts}</select></label>
    <label>You are <select id="pg-actor"></select></label>
    <button class="btn btn--ghost" id="pg-reset" type="button">Start over</button>
  </div>
  <div class="play-grid">
    <div><h2 class="h3">Functions</h2><div id="pg-fns" class="fns"><p class="muted">Loading the EVM…</p></div></div>
    <div><h2 class="h3">Accounts</h2><table class="balances" id="pg-bal"></table></div>
  </div>
  <figure class="trace"><figcaption>Your transactions <span class="muted">· newest first</span></figcaption><div class="trace-wrap"><table><thead><tr><th scope="col">who</th><th scope="col">call</th><th scope="col">result</th><th scope="col">gas</th></tr></thead><tbody id="pg-log" aria-live="polite"></tbody></table></div></figure>
</section>
<noscript><p>The playground needs JavaScript. Every other page works without it.</p></noscript>`;
  page('playground.html', { title: 'Run it · Learn Solidity', desc: 'Deploy and call Solidity contracts in an EVM running in your browser: five test accounts, real gas and reverts.', body, current: 'playground.html', scripts: '<script type="module" src="assets/js/playground.js"></script>' });
}

function resources() {
  const groups = [
    ['Reference', [
      ['Solidity documentation', 'https://docs.soliditylang.org/', 'The language reference, by the Solidity team. The source of truth for every rule on this site.'],
      ['Mastering Ethereum', 'https://github.com/ethereumbook/ethereumbook', 'Antonopoulos and Wood’s book, free on GitHub.'],
      ['Solidity by Example', 'https://solidity-by-example.org/', 'Short, runnable contracts for one idea each.'],
    ]],
    ['Practice', [
      ['CryptoZombies', 'https://cryptozombies.io/', 'An interactive course that builds a game step by step.'],
      ['Speedrun Ethereum', 'https://speedrunethereum.com/', 'Build-and-ship challenges.'],
      ['Ethernaut', 'https://ethernaut.openzeppelin.com/', 'Security puzzles: break a contract to pass each level.'],
    ]],
    ['Tools', [
      ['Remix', 'https://remix.ethereum.org/', 'Write, compile and deploy in the browser.'],
      ['Foundry', 'https://book.getfoundry.sh/', 'Tests written in Solidity, a fast local chain, gas reports.'],
      ['Hardhat', 'https://hardhat.org/', 'A JavaScript development environment.'],
      ['OpenZeppelin Contracts', 'https://docs.openzeppelin.com/contracts/', 'Audited building blocks: tokens, access control, reentrancy guards.'],
    ]],
    ['Security', [
      ['Smart Contract Best Practices', 'https://github.com/ConsenSys/smart-contract-best-practices', 'Known attacks and how to avoid them.'],
      ['Not So Smart Contracts', 'https://github.com/crytic/not-so-smart-contracts', 'Real vulnerable contracts, with the fix.'],
      ['SWC Registry', 'https://swcregistry.io/', 'A numbered catalogue of weakness types. Older, but the categories still hold.'],
    ]],
    ['Ask', [
      ['Ethereum Stack Exchange', 'https://ethereum.stackexchange.com/', 'Questions and answers.'],
      ['r/ethdev', 'https://www.reddit.com/r/ethdev/', 'A developer forum.'],
    ]],
  ];
  const body = `<div class="page-head"><p class="kicker">Resources</p><h1>Where to go next</h1><p class="lede">A short list, chosen for learners. These are other people’s sites; this site has no connection to them.</p></div>
${groups.map(([g, items]) => `<section class="lesson" aria-labelledby="h-${g}"><h2 id="h-${g}">${g}</h2><ul class="links">${items.map(([t, u, d]) => `<li><a href="${u}">${esc(t)}</a><span>${esc(d)}</span></li>`).join('')}</ul></section>`).join('')}`;
  page('resources.html', { title: 'Resources · Learn Solidity', desc: 'A short list of Solidity references, practice sites, tools and security guides.', body, current: 'resources.html' });
}

function about() {
  const body = `<div class="page-head"><p class="kicker">About</p><h1>How this site is made</h1><p class="lede">A free, open-source way to learn Solidity by watching contracts run. No accounts, no tracking, no course to buy.</p></div>
<section class="lesson" aria-labelledby="h-how"><h2 id="h-how">Every number is a measurement</h2>
<ol class="numbered">
  <li>The ${TOTALS.files} Solidity files in <code>contracts/</code> are compiled with solc ${esc(SOLC)} (optimizer on, 200 runs, Cancun EVM).</li>
  <li>Each lesson has a script in <code>tools/scenarios.mjs</code>: who deploys, who calls what, with how much ether.</li>
  <li>The scripts run in EthereumJS, a JavaScript implementation of the Ethereum Virtual Machine, on a fresh chain per lesson: five named accounts (Alice, Bob, Carol, Dave and Mallory), plus as many more as a lesson needs (the unbounded-loop lesson adds 199 members). Every listed transaction's gas, return value, events and revert reason is recorded in <code>data/runs.json</code>; unlisted setup calls are counted there, and the build stops if one of them fails.</li>
  <li>The pages are written from that file. The text quotes it rather than retyping it.</li>
</ol>
<p>Blocks have a 30,000,000 gas limit, as on Ethereum mainnet, and a transaction may use a whole block. Gas figures are for the whole transaction, including the 21,000 base cost every transaction pays; read-only calls show execution gas only and are marked with an asterisk. On a public network your numbers will match only for the same compiler, settings and EVM version.</p></section>
<section class="lesson" aria-labelledby="h-limits"><h2 id="h-limits">What this site is not</h2>
<p>It is not an audit and not financial advice. The contracts are teaching code: small, readable, deliberately incomplete. Before you deploy anything that holds real money, have it tested and reviewed.</p></section>`;
  page('about.html', { title: 'About · Learn Solidity', desc: 'How Learn Solidity compiles and runs every contract to produce the figures it prints.', body, current: 'about.html' });
}

landing();
lessonPage('basics', 'basics.html');
lessonPage('advanced', 'advanced.html');
lessonPage('security', 'security.html');
examplesHub();
for (const k of Object.keys(EXAMPLES)) examplePage(k);
playground();
resources();
about();

console.log(`site built: ${TOTALS.files} files, ${TOTALS.contracts} contracts, ${TOTALS.tx} transactions (${TOTALS.listed} listed, ${TOTALS.reverts} reverted), solc ${SOLC}, bundle ${BUNDLE_KB} KB`);
