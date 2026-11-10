// Compile every contract in contracts/ with solc, then run every scenario in a fresh local chain.
// Writes data/artifacts.json (ABI + bytecode for the browser) and data/runs.json (every recorded step).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import solc from 'solc';
import { LocalChain, ETH } from './chain.mjs';
import { SCENARIOS } from './scenarios.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTRACTS = path.join(ROOT, 'contracts');

export function compileAll() {
  const sources = {};
  for (const dir of fs.readdirSync(CONTRACTS)) {
    for (const f of fs.readdirSync(path.join(CONTRACTS, dir)).filter((x) => x.endsWith('.sol'))) {
      sources[`${dir}/${f}`] = { content: fs.readFileSync(path.join(CONTRACTS, dir, f), 'utf8') };
    }
  }
  const input = {
    language: 'Solidity',
    sources,
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: 'cancun',
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object'] } },
    },
  };
  const out = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = (out.errors || []).filter((e) => e.severity === 'error');
  if (errors.length) throw new Error(errors.map((e) => e.formattedMessage).join('\n'));
  const warnings = (out.errors || []).filter((e) => e.severity === 'warning').map((e) => e.formattedMessage.split('\n')[0]);
  const artifacts = {};
  for (const [file, contracts] of Object.entries(out.contracts)) {
    for (const [name, c] of Object.entries(contracts)) {
      if (!c.evm.bytecode.object) continue; // interfaces and abstract contracts
      artifacts[name] = {
        file,
        abi: c.abi,
        bytecode: '0x' + c.evm.bytecode.object,
        runtimeBytes: c.evm.deployedBytecode.object.length / 2,
      };
    }
  }
  return { artifacts, warnings, compiler: solc.version(), files: Object.keys(sources).length };
}

const fmtEth = (wei) => {
  const s = (Number(wei) / Number(ETH)).toFixed(4).replace(/\.?0+$/, '');
  return `${s} ETH`;
};

export async function runAll(artifacts) {
  const runs = {};
  for (const sc of SCENARIOS) {
    const chain = await LocalChain.create();
    const steps = [];
    const t = {
      async deploy(alias, name, from, args = [], value = 0n) {
        const r = await chain.deploy(alias, artifacts[name], from, args, value);
        steps.push({ kind: 'deploy', note: `deploy ${alias}`, ...r, call: `new ${name}(${args.map((a) => chain.fmt(a)).join(', ')})` });
        if (!r.ok) throw new Error(`${sc.id}: deploy ${name} failed: ${r.error?.text}`);
      },
      async send(from, alias, fn, args = [], value = 0n, note = null, hidden = false, meta = null) {
        const r = await chain.send(from, alias, fn, args, value);
        if (hidden) {
          // an unlisted setup call must still succeed, or the counts it feeds are wrong
          if (!r.ok) throw new Error(`${sc.id}: hidden ${fn}() by ${from} reverted: ${r.error && r.error.text}`);
          t.hiddenCount++;
          return r;
        }
        const st = { kind: 'tx', note, ...r, valueText: value ? fmtEth(value) : null };
        if (meta) st.meta = meta;
        if (t.track) st.state = await t.track(chain);
        steps.push(st);
        return r;
      },
      hiddenCount: 0,
      /** Record that `count` transactions were sent but are not listed, with what they were. */
      setup(note) {
        steps.push({ kind: 'setup', note, count: t.hiddenCount });
        t.hiddenCount = 0;
      },
      addActor: (name) => chain.addActor(name),
      track: null,
      async transfer(from, alias, value, note = null) {
        const d = await chain.transfer(from, alias, value);
        steps.push({ kind: 'tx', note, ...d, valueText: fmtEth(value) });
      },
      async read(alias, fn, args = [], note = null) {
        const r = await chain.read(alias, fn, args);
        steps.push({ kind: 'read', note, to: alias, call: `${fn}(${args.map((a) => chain.fmt(a)).join(', ')})`, ok: r.ok, returns: r.ok ? chain.fmt(r.value) : null, error: r.ok ? undefined : r.error, gas: r.gas != null ? Number(r.gas) : null });
      },
      async balance(alias, note = null) {
        const b = await chain.balance(alias);
        steps.push({ kind: 'balance', note: note || `${alias} balance`, to: alias, returns: fmtEth(b), wei: b.toString() });
      },
    };
    await sc.run(t);
    runs[sc.id] = { id: sc.id, file: sc.file, title: sc.title, example: !!sc.example, steps, compare: sc.compare || null, sent: chain.sent };
  }
  return runs;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t0 = Date.now();
  const c = compileAll();
  const runs = await runAll(c.artifacts);
  fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'data', 'artifacts.json'), JSON.stringify({ compiler: c.compiler, artifacts: c.artifacts }));
  fs.writeFileSync(path.join(ROOT, 'data', 'runs.json'), JSON.stringify({ compiler: c.compiler, evm: 'cancun', files: c.files, warnings: c.warnings, runs }, null, 1));
  const steps = Object.values(runs).reduce((n, r) => n + r.steps.length, 0);
  console.log(`compiled ${c.files} files (${Object.keys(c.artifacts).length} contracts) with solc ${c.compiler}; ${Object.keys(runs).length} scenarios, ${steps} steps; ${c.warnings.length} warnings; ${Date.now() - t0} ms`);
}
