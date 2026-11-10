# Learn Solidity

Learn Solidity from contracts you can watch run. Every contract on the site is compiled with solc 0.8.28 and run in an
in-memory Ethereum Virtual Machine when the site is built. Each lesson prints what really happened: who called what,
the gas it cost, the events it emitted and why it was refused.

- **Basics**: state, mappings and structs, `require`, ether.
- **Advanced**: custom errors, storage packing, inheritance, and why `unchecked { ++i; }` no longer saves gas.
- **Security**: reentrancy (a drain that works under 0.8, beside the safe version), overflow, `tx.origin` phishing and unbounded loops. Each is run, then run again against its fix.
- **Examples**: the three contracts from this repository, unchanged. One of them, `PaymentForWork`, can promise more than it holds; the page shows Carol's failed withdrawal and the one-variable fix.
- **Run it**: the same EVM in your browser. Deploy a contract and call it as Alice, Bob, Carol, Dave or Mallory.

## Build

```bash
cd tools
npm ci
npm run build   # compile contracts/, run tools/scenarios.mjs, write every page and data/runs.json
npm run check   # re-run everything and confirm each recorded figure reproduces exactly
```

The output is plain static HTML at the repository root (no framework, no server). `tools/node_modules/` is not committed;
the browser bundle `assets/js/chain.bundle.js` and `data/` are, so the site deploys without a build step.

## Layout

```
contracts/      basics/ advanced/ security/ examples/   the Solidity sources
tools/          chain.mjs (the VM wrapper, also bundled for the browser), scenarios.mjs (each lesson's run),
                content.mjs (lesson text, reading numbers from the runs), build.mjs, check.mjs
data/           runs.json (every recorded step), playground.json (ABI and bytecode for the browser)
assets/         css, js (playground), img
DESIGN-LOG.md   the DADA design run: panel rounds, decisions and measurements
```

Teaching code, not audited. MIT licence; see [LICENSE](LICENSE).
