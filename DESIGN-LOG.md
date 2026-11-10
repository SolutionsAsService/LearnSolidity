# DESIGN-LOG: LearnSolidity (DADA Full run)

Date 2026-11-10. Conductor: Claude Code. Panel verdict files and probes were kept in the session scratchpad
(`ls-r0/`, `ls-r1/`, …) and are summarised here.

## 1. Traversal Plan

**Brief.** "Major dada revamp" of the LearnSolidity site, then add it to the portfolio and to the coding roadmap.

**Mode: Adaptive.** The audience is learners, some of whom will deploy code that holds money, so both MAYA poles must
hold. The advanced pole is that every snippet is compiled and run, with gas and reverts shown. The acceptable pole is that
a beginner can follow it on a phone.

**Run type: Full.** This is a redesign of a site that, as measured in R0, is a template with broken parts. The Landing
rules apply to the home page.

**Multi-page plan.** The site keeps its six-page shape, plus three things the old site never had: an examples hub, one page
per example contract, and a page where you can run the contracts yourself.

| Page | Contents |
|---|---|
| index | Landing hero summarising every topic |
| basics | 4 lessons |
| advanced | 4 lessons |
| security | 4 attacks plus the example bug |
| examples | Hub, plus voting, pets and payment |
| playground | Run the contracts in the browser |
| resources | Reference links |
| about | How the site is made |

**Inventory, and the one fact that stands for each topic.** Every figure comes from `data/runs.json`.

| Topic | Fact |
|---|---|
| Basics | A first storage write costs 43,405 gas; the second, 26,305. |
| Advanced | The same three fields cost 88,096 gas spread over three slots and 44,174 packed into one. |
| Security | A re-entering attacker drains 8 ETH from a bank in one transaction. |
| Examples | PaymentForWork promises 2 ETH while holding 1, and Carol's withdraw fails. |
| Playground | The same contracts, run in your browser. |

Resources and About are reference pages. They are reached from the navigation and the footer, not the hero, because they hold no lesson.

**Tooling inventory.**

| Job | Tool used |
|---|---|
| Graph rendering | None. The graph was read as text. |
| Compilation | solc-js 0.8.28 |
| Execution | EthereumJS VM 8.1 (Cancun) |
| ABI encoding | viem 2.21 |
| Measurement | Playwright and headless Chromium probes |
| Panel | Agent tool, one seat per reference, at most three at a time, each filing to a panel directory |
| Panel choice | `pick_panel.py --mode adaptive --run-type full --money --data-graphic --size 8` |

**Panel (from the picker, no overrides).** Debord, Shklovsky, Holmes, Mace, Cairo, Tufte, Papanek, Krug.
Dotted pairs: Debord ↔ Krug, Shklovsky ↔ Krug.

**Seed** (labels from references/anchor-graph.md):
- Stance: MAYA (Loewy).
- Rules: the First screen rule and the landing-summary rule; *The Visual Display of Quantitative Information* (Tufte),
  data-ink and small multiples.
- Breaker: Shklovsky's estrangement. The page shows the reader a contract failing, not a list of vulnerabilities.
- Counterpoint (dotted): Krug ↔ Shklovsky. The failure must still be self-evident at a glance.

## 3. Panel Reports

### Panel, WHOLE, round R0 (premortem on the inherited site, commit 15b55d6)

| Critic | Anchor used | Observed in the work | Verdict | Requested change |
|---|---|---|---|---|
| Critic: Provocateur (Debord) | *Society of the Spectacle*, theses 1 and 4 | "most comprehensive"; Advanced blurb promises topics the page lacks; unsourced testimonials; @solidity_lang called "ours"; code never runs; "audit-ready" beside a buggy example | OBJECT | Cut the claims, testimonials and borrowed handle; show runs; teach the bug |
| Critic: Provocateur (Shklovsky) | "Art as Technique" | SaaS hero, cards and testimonials; vulnerabilities as a glossary; the strangest material (a failing withdraw) buried | OBJECT | Drop the template; make the failing withdraw the signature; vulnerabilities as events |
| Critic: Inclusion (Holmes) | *Mismatch* | Fixed header covers a phone screen; duplicate dead toggles; "complete beginner" with unexplained terms; code needs a desktop | OBJECT | Static header on phones; one working toggle; define terms at first use; wrap code; state outputs in text |
| Critic: Inclusion (Mace) | *Principles of Universal Design* P2, P4, P7 | No :focus-visible; CTAs 20 px tall; header covers 520–640 px; current page shown by tint only; blank black button; animation ignores reduced motion | OBJECT | 2 px focus ring; 44 px targets; non-fixed mobile nav; aria-current and underline; one toggle; honour reduced motion |
| Critic: Evidence (Cairo) | *How Charts Lie* | Security page's "vulnerable" contract cannot be drained under its own 0.8 pragma (underflow reverts); overflow claim never shown; PaymentForWork bug; testimonials; 404s; "All rights reserved" against MIT | OBJECT | Show a drain that works; show the revert; teach the bug; remove; fix; say MIT |
| Critic: Evidence (Tufte) | *Visual Display*: data-ink, Lie Factor, small multiples | 0 data graphics; only figure is a 404; gas defined, never shown; card panels are non-data ink | OBJECT | Measured graphic; gas per snippet as small multiples on a zero baseline; rules not cards; plot owed against deposited |
| Critic: Social (Papanek) | *Design for the Real World* | Persuasion a learner cannot check; a money bug unmentioned; the useful contracts hidden; phone users pay in effort | OBJECT | Delete; show the failing run and fix; examples first; fix mobile; show gas and reverts; state limits |
| Critic: Usability (Krug) | *Don't Make Me Think* | "Get Started" is unstyled; mobile header fails the five-second test; site name changes per page; dead toggles; broken alt; happy talk | OBJECT | Real primary button; one site name plus a per-page H1; one toggle; cut intros |

Andon pulled: no. Every finding enters the Frontier.

### Frontier (opening)

| Candidate | Reached via | Status |
|---|---|---|
| Run every snippet; print gas, result, events and revert | R0: Debord F5, Cairo F2, Tufte F3, Papanek F5, Shklovsky F4, Holmes F4 | TAKEN (M1) |
| The PaymentForWork failure as the signature graphic | R0: Shklovsky F3, Tufte F5, Papanek F2, Cairo F3 | TAKEN (M3) |
| A reentrancy drain that works under 0.8, beside the safe version | R0: Cairo F1 | TAKEN (M1) |
| Delete testimonials, superlatives and the borrowed handle; MIT footer | R0: Debord F1, F3, F4; Papanek F1; Cairo F4, F6 | TAKEN (M2) |
| Mobile header, focus, targets, toggle, motion, aria-current | R0: Holmes, Mace, Krug | TAKEN (M4) |
| Terms defined at first use | R0: Holmes F3 | TAKEN (M4) |
| Run the contracts yourself in the browser | Breaker escalation | TAKEN (M5) |

## 2. Decision Records

**M1, Run everything (KEEP-THE-RULE).** Depends on: none.
- Anchors: Rule *Visual Display* (data-ink), Cairo's reproducibility.
- Intent: every lesson is a real contract, compiled by solc-js 0.8.28 and run in an in-memory EVM, with its trace (who
  called what, gas, return, events, revert) printed from `data/runs.json`.
- Formal argument: a learner cannot check a claim about gas or a revert they never see. A trace makes each claim
  checkable, and `npm run build` reproduces every figure.
- Alternatives rejected:
  - Remix links: run elsewhere, with no record on the page.
  - Hand-typed outputs: they drift from the code.
- Consequence: a build step (Node), and the site's numbers change when the compiler changes. The compiler version is
  printed.
- Fence: none broken.
- Advanced pole: real EVM traces. Acceptable pole: each trace is a short table in plain words.

**M2, Delete what persuades without evidence (KEEP-THE-RULE; deletion).** Depends on: none.
- Removed: testimonials, "most comprehensive", the @solidity_lang "our Twitter", "All rights reserved", the 404 diagram,
  the duplicate toggles and the empty "Meet the Team".
- Retained value: the six-page structure, the three-level path, the compiling snippets' topics and the resource list
  (trimmed).

**M3, The failing withdraw as the landing graphic (BREAK).** Depends on: M1.
- Anchors: Breaker, Shklovsky's estrangement; Rule, the landing-summary rule; Counterpoint, Krug (dotted).
- Intent: the hero is a block of real transactions, one per topic, with gas bars on a shared zero baseline. The red row is
  Carol's withdraw() reverting while the contract still owes her 1 ETH.
- Alternatives rejected:
  - A code-editor screenshot hero: habitual.
  - Cards per level: a brochure, failing the summary rule.
- Fence: a learning site's landing usually reassures. This one leads with a failure, because in Solidity the failure is
  what costs money.
- Advanced pole: a failing transaction as the welcome. Acceptable pole: each row is labelled in words and links to its page.

**M4, Access and plain words (KEEP-THE-RULE).** Depends on: M2.
- Changes:
  - A static header on phones, with one site name and a per-page H1.
  - A 2 px focus ring.
  - 44 px targets.
  - aria-current with an underline.
  - Reduced motion honoured.
  - Terms (gas, wei, transaction, revert, storage) defined at first use.

**M5, Run it yourself (BREAK, escalating M1).** Depends on: M1.
- Intent: a playground page loads the same compiled contracts into the same EVM, bundled for the browser. The visitor sends
  transactions as Alice, Bob or Mallory and gets the same kind of trace.
- Consequence: about 1 MB of JavaScript, loaded on that page only. There is no in-browser compiler, so the contracts are
  the site's own, precompiled; the page says so.


### Panel, WHOLE, round R1 (after M1–M5; real fonts)

| Critic | Anchor used | Observed in the work | Verdict | Requested change |
|---|---|---|---|---|
| Critic: Provocateur (Debord) | *Society of the Spectacle*, theses 1 and 4 | R0 F1–F7 resolved; hidden join() calls left out of the counts; "each attacked and fixed" while Unbounded had no fix; "money is stuck" asserted, not run; some prose figures typed as literals | OBJECT | Count the hidden calls; add a fix or drop the claim; qualify the claim; read the literals from the steps |
| Critic: Provocateur (Shklovsky) | "Art as Technique" | Ledger hero and failing withdraw above the fold; the card row below brings back the SaaS grid; reentrancy is one "ok" row; payment page buries the bug under the code | OBJECT | Ledger rows, not cards; show the re-entries falling; lead with the revert; vary the ledger's form |
| Critic: Inclusion (Holmes) | *Mismatch* | R0 F1, F2, F4, F5 resolved; home lede opens on solc, EVM and revert unexplained; no Terms on security or examples; bug sentence hidden on phones; 20-word link names; a bare "?" | OBJECT | Explain the terms in the lede; Terms on every page; bug sentence at all widths; short aria-labels |
| Critic: Inclusion (Mace) | *Principles of Universal Design* P2, P4, P7 | Focus ring, targets, static header and reduced motion fixed; in forced colours the current page, the chart key and the gas bars disappear | OBJECT | Forced-colours rules for nav, chart key and bars |
| Critic: Evidence (Cairo) | *How Charts Lie* | Scratch rebuild byte-identical; "200 members" were 5 addresses; hidden calls uncounted; payment chart hard-codes ±1 ETH; gas limit not quantified; read rows exceed the stated scale; `npm run check` missing | OBJECT | Distinct members; count the calls; chart from recorded state; print the limit; fix the caption; add check |
| Critic: Evidence (Tufte) | *Visual Display*: Lie Factor, data-ink, small multiples | Desktop hero bars Lie Factor 1.00; on mobile the bar track narrows (Lie Factor 0.95); every table uses its own scale; deploys squeeze the transaction bars; held line inferred | OBJECT | Fixed-width track; one scale per page; deploys as numbers only; plot recorded state |
| Critic: Social (Papanek) | *Design for the Real World* | R0 F1–F6 resolved; wrapped code loses its indent on phones; no gas-to-ether example; 903 KB download not stated | PASS | Hanging indent; one conversion at a stated price; state the size |
| Critic: Usability (Krug) | *Don't Make Me Think* | Five-second test passes (site, Basics, Security, Examples); legibility trace passes (row 3 bar → call → result → link); hero rows look unclickable on touch; a bare "?"; "Three steps" over four items | OBJECT | Visible row cue; replace the "?"; retitle |

Andon pulled: no. Statement of meaning (from the seats): "the site now shows code failing and costing, instead of describing it".

### Resolutions (R1)

| Finding | Resolution |
|---|---|
| Debord + Cairo: hidden join() calls left uncounted | ADAPT (M6): the chain counts every transaction sent (491); the footer says 93 are listed and the rest are setup calls, and setup rows in the traces give each batch's count |
| Debord: Unbounded "attacked and fixed" without a fix | ADAPT (M6): `PullPayout` added and run; payout costs 43,451 gas with 200 members |
| Debord: "money is stuck" asserted, not run | ADAPT (M6): rewritten around the measured growth, with the 30,000,000 limit named and the crossing point computed from two runs (about 1,483 members) |
| Debord: prose figures typed as literals | ADAPT (M6): pet fees, refund, payment amounts, the hero's "1 ETH" and the loop difference are all read from the steps |
| Cairo: "200 members" were 5 repeated addresses | ADAPT (M6): 200 distinct accounts. The payout figure rose from 614,537 to 4,115,537 gas, so the old figure understated the danger by a factor of 6.7 |
| Cairo + Tufte: payment chart hard-codes ±1 ETH | ADAPT (M6): held and owed are read from the chain after every transaction (balance plus `workers()`); the SVG description is generated |
| Cairo: block gas limit never quantified | ADAPT (M6): limit named and crossing computed |
| Cairo: read rows exceed the stated scale | ADAPT (M6): the caption states that bars are transactions only, and reads and deploys are numbers |
| Cairo: `npm run check` missing | ADAPT (M6): `tools/check.mjs` re-runs every scenario and diffs against `data/runs.json` ("ok: all 125 recorded steps reproduce exactly") |
| Tufte: mobile bar track narrows | ADAPT (M6): fixed track and fixed 8.5ch number column; the red edge is an inset shadow, so all bars share zero |
| Tufte: every table uses its own scale | ADAPT (M6): one scale per page shared by every table on it (the bug and fix tables now share one) |
| Tufte: deploys squeeze the transaction bars | ADAPT (M6): deploys are numbers only |
| Shklovsky: card row brings back the SaaS grid | ADAPT (M6): the levels and the examples hub are ledger rows, not cards |
| Shklovsky: reentrancy shown as one "ok" row | ADAPT (M6): the attacker emits `Reentered(depth, bankBalance)`; a staircase chart shows the bank falling 8 → 0 inside one transaction |
| Shklovsky: payment page buries the bug under the code | ADAPT (M6): the run and the held-vs-promised chart come first, then the code |
| Shklovsky: "vary the ledger's form on every page" | OVERRULE (MAYA, acceptable pole): one consistent trace table is how a learner learns to read a run; variety comes from the staircase, the held-vs-promised chart and the growth figures. The objection stays logged |
| Holmes: home lede opens on unexplained terms | ADAPT (M6): the lede now says "Ethereum Virtual Machine", "cost in gas" and "refused and undone" |
| Holmes: no Terms on security or examples | ADAPT (M6): Terms boxes on security (reentrancy, revert, tx.origin, msg.sender, gas) and on every example page; EVM added to the glossary |
| Holmes: bug sentence hidden on phones | ADAPT (M6): shown at all widths; mobile block bottom 793 px of 812 |
| Holmes + Krug: long link names and a bare "?" | ADAPT (M6): short aria-labels per row; the "?" becomes "yours · 882 KB" |
| Mace: forced colours lose the current page, chart key and bars | ADAPT (M6): `forced-colors` rules give bars and chart fills CanvasText or Mark, the current nav item a Highlight underline and bold, and the chart swatches are SVG |
| Papanek: wrapped code loses its indent on phones | ADAPT (M6): each code line carries its indent as padding (hanging indent) |
| Papanek: no gas-to-ether example | ADAPT (M6): the Counter lesson converts 43,405 gas at a stated 20 gwei |
| Papanek: download size not stated | ADAPT (M6): the bundle size is computed at build and printed on the hero row, the playground lede and the example buttons |
| Krug: hero rows look unclickable on touch | ADAPT (M6): visible → on every row |
| Krug: "Three steps" over four items | ADAPT (M6): retitled "Three levels, then three complete contracts" |

**M6, Resolve R1 (ADAPT, batch).** Depends on: M1–M5.
- The record was compiled from the resolution table above, before the edits, in the same session; it was not written up separately first.
- Residual diff:
  - Reentrancy attack gas 129,435 → 141,795 (the new event; intended).
  - Unbounded payout at 200 members 614,537 → 4,115,537 (distinct members; intended, a correction).
  - Footer transactions 88 → 491 (intended).
  - Contracts 22 → 23 (PullPayout).
  - Mobile hero bottom 784 → 793 px (bug sentence restored; intended).
  - No regressions found by the probes.

### Panel, WHOLE, round R2 (after M6)

| Critic | Anchor used | Observed in the work | Verdict | Requested change |
|---|---|---|---|---|
| Critic: Provocateur (Debord) | *Society of the Spectacle*, theses 1 and 4 | R1 F1–F4 resolved; About still says "five accounts" and "every transaction's gas is recorded"; the transaction gas cap was 10M while the page says 30M; "whatever the size" measured at one size; `/150` and `200 +` typed | OBJECT | Fix About; name the cap; measure two sizes; derive the divisors |
| Critic: Provocateur (Shklovsky) | "Art as Technique" | Ledger rows and the staircase resolve R1; on the payment page the chart's swatches fill the figure (CSS clash) and Terms push the revert below the fold | OBJECT | Fix the swatches; move the label; Terms after the run |
| Critic: Inclusion (Holmes) | *Mismatch* | R1 F1–F4 resolved; payment chart key swatches render about 505 px; "promised" label overlaps a bar | OBJECT | One CSS line; move the label |
| Critic: Inclusion (Mace) | *Principles of Universal Design* P4, P7 | 308 real Tab stops all ringed; nav current shown by weight and rule; swatch regression 760×760; revert bars 1.07:1 in light forced colours; screenshots older than the last CSS edit | OBJECT | `.owed .key` size; CanvasText border on revert bars |
| Critic: Evidence (Cairo) | *How Charts Lie* | R1 F1–F6 resolved, byte-identical rebuild; the per-member slope mixes first credits with repeat credits (the conductor's probe: repeat 7,636 per member, crossing about 3,900); 1,482 against 1,483; hidden sends unchecked | OBJECT | Separate the regimes; align the figures; throw on a failed hidden send |
| Critic: Evidence (Tufte) | *Visual Display*: Lie Factor, chartjunk | Hero bars Lie Factor 1.00 at both sizes; payment trace on one scale; staircase correct; legend swatches are 760 px blocks (the largest ink on the page, encoding nothing); slope mislabelled | OBJECT | Scope the svg rule; name the range |
| Critic: Social (Papanek) | *Design for the Real World* | Hanging indent, gas-to-ether example and download size all present | PASS | Optional: grammar |
| Critic: Usability (Krug) | *Don't Make Me Think* | Five-second test and trunk test pass; every row has a → cue | PASS | Optional: label the KB figure as a download; "01" heading wrap |

Andon pulled: no. One defect, the swatch CSS clash, was raised by four seats. It is a regression of M6 that the conductor's
captures missed, because they predated the final CSS edit (Mace F6). That miss is entered in the Carry-Forward below.

### Resolutions (R2)

| Finding | Resolution |
|---|---|
| Tufte + Mace + Shklovsky + Holmes: legend swatches fill the figure | ADAPT (M7): the rule is scoped to `.owed > svg`, and the key is sized by `.owed .key` (12 px, measured) |
| Shklovsky + Holmes + Tufte: "promised" label overlaps a bar | ADAPT (M7): labels sit above the first held-only and the first promised-only bars |
| Mace: revert bars 1.07:1 in light forced colours | ADAPT (M7): CanvasText outline on revert bars and a CanvasText double edge on the hot row |
| Cairo + Tufte: the slope mixes first credits with repeat credits | ADAPT (M7): each payout is run twice (first, then repeat) at 50 and 200 members. Repeat payouts cost 7,636 gas per member, first payouts 24,736. The repeat crossing is about 3,926 members; the old "1,482" is withdrawn |
| Cairo: 1,482 against 1,483 | ADAPT (M7): one computed figure, printed once |
| Cairo: hidden sends unchecked | ADAPT (M7): the build throws if a hidden setup call reverts |
| Debord: About still says "five accounts" and "every transaction recorded" | ADAPT (M7): "five named accounts, plus as many more as a lesson needs"; "every listed transaction's …; unlisted setup calls are counted" |
| Debord: transaction cap 10M while the page says 30M | ADAPT (M7): one constant, `BLOCK_GAS_LIMIT` = 30,000,000, used for blocks and transactions, named on the page and in About |
| Debord: "whatever the size" measured at one size | ADAPT (M7): PullPayout measured at 1 and at 200 members (payout 43,451 and 26,351; claim 70,214 and 53,114) |
| Debord: `/150` and `200 +` typed | ADAPT (M7): divisors come from the recorded member counts (`meta.members`) and setup counts |
| Shklovsky: Terms push the revert below the fold | ADAPT (M7): Terms come after the run on example pages |
| Krug: unlabelled KB figure | ADAPT (M7): reads "882 KB download" |
| Krug: "01" heading wrap | ADAPT (M7): a flex heading keeps the number beside its title |
| Papanek: grammar | ADAPT (M7) |

**M7, Resolve R2 (ADAPT, batch).** Depends on: M6.
- Residual diff:
  - Unbounded figures re-measured: payout at 200 members, first round 4,115,537 and repeat 1,550,537; the crossing changed from 1,482 to 3,926.
  - Transactions 491 → 494 (three new runs: two repeat payouts and the 1-member PullPayout payout).
  - Gas figures elsewhere unchanged (`check.mjs` reproduces all 127 recorded steps).
  - No regressions found by the probes (22 page-and-size checks clean; hero bottoms 527 and 793 px).
