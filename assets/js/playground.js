// Playground: the same LocalChain the build uses, running in the page.
import { LocalChain, parseEther, formatEther } from './chain.bundle.js';

const $ = (id) => document.getElementById(id);
const els = { contract: $('pg-contract'), actor: $('pg-actor'), fns: $('pg-fns'), bal: $('pg-bal'), log: $('pg-log'), reset: $('pg-reset') };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

let data, chain, name;

async function start() {
  data = await (await fetch('data/playground.json')).json();
  const want = new URLSearchParams(location.search).get('c');
  if (want && data.artifacts[want]) els.contract.value = want;
  await fresh();
  els.contract.addEventListener('change', fresh);
  els.reset.addEventListener('click', fresh);
}

async function fresh() {
  name = els.contract.value;
  els.fns.innerHTML = '<p class="muted">Starting a fresh chain…</p>';
  els.log.innerHTML = '';
  chain = await LocalChain.create();
  els.actor.innerHTML = Object.keys(chain.actors).map((a) => `<option>${a}</option>`).join('');
  const d = await chain.deploy(name, data.artifacts[name], 'Alice');
  logRow(d, `Alice deploys ${name}`);
  renderFns();
  await renderBalances();
}

function parseArg(type, raw) {
  const v = raw.trim();
  if (type === 'address') {
    const actor = Object.keys(chain.actors).find((a) => a.toLowerCase() === v.toLowerCase());
    if (actor) return actor;
    if (/^0x[0-9a-fA-F]{40}$/.test(v)) return v;
    throw new Error(`“${v}” is not an account: try Alice, Bob, Carol, Dave or Mallory`);
  }
  if (/^u?int/.test(type)) {
    const m = v.match(/^([\d.]+)\s*eth$/i);
    if (m) return parseEther(m[1]);
    if (!/^\d+$/.test(v)) throw new Error(`“${v}” is not a whole number (write “0.5 ETH” for ether)`);
    return BigInt(v);
  }
  if (type === 'bool') return v === 'true';
  return v;
}

function renderFns() {
  const abi = data.artifacts[name].abi;
  const fns = abi.filter((x) => x.type === 'function');
  fns.sort((a, b) => (a.stateMutability === 'view' || a.stateMutability === 'pure') - (b.stateMutability === 'view' || b.stateMutability === 'pure'));
  const recv = abi.some((x) => x.type === 'receive');
  const rows = fns.map((f, i) => {
    const ro = f.stateMutability === 'view' || f.stateMutability === 'pure';
    const ins = f.inputs.map((p, j) => `<input type="text" data-i="${j}" aria-label="${esc(f.name)}: ${esc(p.name || p.type)} (${esc(p.type)})" placeholder="${esc(p.name || p.type)} · ${esc(p.type)}${/^u?int/.test(p.type) ? ', or 1 ETH' : p.type === 'address' ? ', e.g. Bob' : ''}">`).join('');
    const val = f.stateMutability === 'payable' ? `<input type="text" data-value aria-label="${esc(f.name)}: ether to send" placeholder="ether to send, e.g. 0.1">` : '';
    return `<form class="fn" data-fn="${i}"><button class="btn${ro ? ' btn--ghost' : ''}" type="submit">${esc(f.name)}</button>${ins}${val}<span class="tag">${ro ? 'read · free' : f.stateMutability === 'payable' ? 'transaction · can take ether' : 'transaction'}</span></form>`;
  });
  if (recv) rows.unshift(`<form class="fn" data-recv><button class="btn" type="submit">send ether</button><input type="text" data-value aria-label="ether to send to the contract" placeholder="ether, e.g. 1"><span class="tag">plain transfer · runs receive()</span></form>`);
  els.fns.innerHTML = rows.join('');
  els.fns.querySelectorAll('form').forEach((form) => form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const who = els.actor.value;
    try {
      const vIn = form.querySelector('[data-value]');
      const value = vIn && vIn.value.trim() ? parseEther(vIn.value.trim().replace(/\s*eth$/i, '')) : 0n;
      if (form.hasAttribute('data-recv')) {
        logRow(await chain.transfer(who, name, value), null, value);
      } else {
        const f = fns[+form.dataset.fn];
        const args = f.inputs.map((p, j) => parseArg(p.type, form.querySelector(`[data-i="${j}"]`).value));
        const ro = f.stateMutability === 'view' || f.stateMutability === 'pure';
        if (ro) {
          const r = await chain.read(name, f.name, args, who);
          logRow({ from: who, to: name, call: `${f.name}(${args.map((a) => chain.fmt(a)).join(', ')})`, ok: r.ok, returns: r.ok ? chain.fmt(r.value) : null, error: r.error, gas: null, events: [], read: true });
        } else {
          logRow(await chain.send(who, name, f.name, args, value), null, value);
        }
      }
      await renderBalances();
    } catch (e) {
      logRow({ from: who, to: name, call: form.querySelector('button').textContent, ok: false, error: { text: e.message }, gas: null, events: [], input: true });
    }
  }));
}

function logRow(s, label, value = 0n) {
  const tr = document.createElement('tr');
  if (s.ok === false) tr.className = 'is-rev';
  const result = s.ok === false ? `<span class="rev">${s.input ? 'not sent: ' : 'reverted: '}${esc(s.error.text)}</span>`
    : s.returns != null ? `<span class="ret">${esc(s.returns)}</span>` : '<span class="okc">ok</span>';
  const ev = s.events && s.events.length ? `<span class="ev">${s.events.map(esc).join('<br>')}</span>` : '';
  const v = value ? ` <span class="val">+${esc(formatEther(value))} ETH</span>` : '';
  tr.innerHTML = `<td class="who">${esc(s.from)}${s.read ? ' (read)' : ''}</td><td class="call"><code>${esc(label || `${s.to}.${s.call}`)}</code>${v}</td><td class="res">${result}${ev}</td><td class="gas"><span class="g">${s.gas == null ? '—' : s.gas.toLocaleString('en-US')}</span></td>`;
  els.log.prepend(tr);
}

async function renderBalances() {
  const rows = [];
  for (const a of [...Object.keys(chain.actors), name]) rows.push(`<tr><td>${esc(a)}</td><td>${Number(formatEther(await chain.balance(a))).toLocaleString('en-US', { maximumFractionDigits: 6 })} ETH</td></tr>`);
  els.bal.innerHTML = rows.join('');
}

start().catch((e) => { els.fns.innerHTML = `<p class="rev">The in-browser EVM could not start: ${esc(e.message)}</p>`; console.error(e); });
