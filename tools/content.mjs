// Lesson text. Every number is read from the recorded runs (r = runs[id].steps), never typed.
export const n = (x) => Number(x).toLocaleString('en-US');
const step = (r, note) => {
  const s = r.find((x) => x.note === note);
  if (!s) throw new Error('no step noted ' + note);
  return s;
};
const pct = (a, b) => Math.round((1 - a / b) * 100);

export const TERMS = {
  'smart contract': 'A program stored on a blockchain. Anyone can call its functions; nobody can quietly change its code.',
  transaction: 'A signed message that changes the chain: deploys a contract, calls a function or sends ether. It costs gas.',
  gas: 'The unit of work the network charges for. Every operation has a fixed gas cost; storing data is the expensive part.',
  'ether (ETH)': 'The currency of Ethereum. 1 ETH = 10¹⁸ wei, the smallest unit.',
  storage: 'The data a contract keeps between transactions. It is written to every node, which is why writing it costs the most gas.',
  revert: 'A transaction that stops and undoes everything it did. The sender still pays for the gas used up to that point.',
  'msg.sender': 'The address that called this function directly: a person’s account or another contract.',
  event: 'A log line a contract emits. Apps listen for events; contracts cannot read them.',
  'tx.origin': 'The account that signed the whole transaction, however many contracts it passed through on the way.',
  reentrancy: 'Calling back into a contract while an earlier call to it is still running, before it has finished updating its records.',
  EVM: 'The Ethereum Virtual Machine: the computer every Ethereum node runs, which executes contract code the same way everywhere.',
};
const ethOf = (wei) => `${Number(BigInt(wei)) / 1e18} ETH`;

export const PAGES = {
  basics: {
    title: 'Basics',
    h1: 'Basics: state, calls and saying no',
    lede: 'Four small contracts. Each one was compiled and run; the table under it is what happened.',
    lessons: [
      {
        id: 'counter',
        terms: ['smart contract', 'storage', 'gas', 'transaction'],
        intro: () => 'A contract is code plus storage. <code>count</code> is a <dfn>state variable</dfn>: it lives in storage and keeps its value between transactions. Reading it is free; changing it costs gas.',
        after: (r) => {
          const a = step(r, 'first write: 0 → 1'), b = step(r, 'second write: 1 → 2'), c = step(r, 'back to zero: refund');
          return `The same function cost <b>${n(a.gas)}</b> gas the first time and <b>${n(b.gas)}</b> the second. Turning a zero into a non-zero value is the most expensive write there is; changing an existing value is cheaper. Setting it back to zero earns a refund, so <code>reset()</code> cost only <b>${n(c.gas)}</b>. Notice that Bob, not the deployer, could reset it: nothing here checks who is calling. What does gas cost in money? You pay gas × gas price. At a gas price of 20 gwei (0.00000002 ETH), the first <code>increment()</code> would cost ${n(a.gas)} × 20 gwei = <b>${(a.gas * 20e-9).toFixed(6)} ETH</b>; gas prices change from block to block, so check the current one before you deploy.`;
        },
      },
      {
        id: 'ledger',
        terms: ['event'],
        intro: () => 'A <dfn>mapping</dfn> is a lookup table from keys to values; a <dfn>struct</dfn> groups fields. <code>record()</code> writes both and emits an event.',
        after: (r) => {
          const c = step(r, 'an address that never wrote');
          return `Every key of a mapping already exists and reads as zero: Carol never wrote, and <code>amountOf(Carol)</code> returned <b>${c.returns}</b>, not an error. Each <code>record()</code> left a <code>Recorded</code> event in the transaction log, which is how a website would learn about it.`;
        },
      },
      {
        id: 'guarded',
        terms: ['msg.sender', 'revert'],
        intro: () => '<code>require(condition, "message")</code> stops a transaction when the condition is false and undoes it. <code>msg.sender</code> is whoever called.',
        after: (r) => {
          const a = step(r, 'not the owner'), b = step(r, 'owner, good value');
          return `Bob’s call reverted with the contract’s own words, “${a.error.text}”, and still cost him <b>${n(a.gas)}</b> gas: a refused transaction is not free. The owner’s valid call went through for <b>${n(b.gas)}</b>.`;
        },
      },
      {
        id: 'piggy',
        terms: ['ether (ETH)'],
        intro: () => 'A contract can hold ether. <code>receive()</code> runs when someone sends ether with no function call; <code>payable</code> marks addresses and functions that may receive it.',
        after: (r) => {
          const b = r.filter((x) => x.kind === 'balance');
          return `Two plain transfers left the contract holding <b>${b[0].returns}</b>. Bob could not smash it; the owner could, and the balance went to <b>${b[1].returns}</b>. The transfer uses <code>call</code> and checks its result: a failed send that nobody checks is a classic bug.`;
        },
      },
    ],
  },
  advanced: {
    title: 'Advanced',
    h1: 'Advanced: paying less, reusing more',
    lede: 'Gas is the price of every line. These four contracts measure where it goes, including one popular trick that no longer helps.',
    lessons: [
      {
        id: 'errors',
        intro: () => 'A custom error (<code>error NotOwner(address caller)</code>) replaces a require string. The string has to be stored in the contract; the error is a 4-byte code plus arguments.',
        after: (r) => {
          const d1 = step(r, 'deploy RequireString'), d2 = step(r, 'deploy CustomError');
          const a = step(r, 'refused with a string'), b = step(r, 'refused with a custom error');
          return `Deploying the custom-error version cost <b>${n(d2.gas)}</b> gas instead of <b>${n(d1.gas)}</b> (${pct(d2.gas, d1.gas)}% less). At call time the difference is small: <b>${n(b.gas)}</b> against <b>${n(a.gas)}</b>. And the error carries data: the revert told us exactly who was refused, <code>${b.error.text}</code>.`;
        },
      },
      {
        id: 'packing',
        intro: () => 'Storage comes in 32-byte slots. Three <code>uint256</code> fields take three slots; a <code>uint64</code>, a <code>uint64</code> and a <code>uint128</code> fit in one.',
        after: (r) => {
          const a = step(r, 'three slots'), b = step(r, 'one slot');
          return `Writing the same three numbers cost <b>${n(a.gas)}</b> gas in three slots and <b>${n(b.gas)}</b> in one: ${pct(b.gas, a.gas)}% less, because the expensive part is touching a slot, not the size of the number. Packing only pays when the fields are written together and the smaller types are big enough for your values.`;
        },
      },
      {
        id: 'inheritance',
        intro: () => 'An <dfn>interface</dfn> lists functions without code; an <dfn>abstract contract</dfn> can hold shared code; a contract can inherit from both. Here <code>Greeter</code> gets <code>onlyOwner</code> from <code>Owned</code>.',
        after: (r) => {
          const a = step(r, 'onlyOwner from Owned');
          return `The modifier came from the parent contract and still did its job: Bob was refused with <code>${a.error.text}</code>, an error declared in <code>Owned</code>, not in <code>Greeter</code>.`;
        },
      },
      {
        id: 'loops',
        intro: () => 'Since Solidity 0.8, arithmetic is checked: an overflow reverts. Wrapping a loop counter in <code>unchecked { ++i; }</code> used to save gas by skipping that check.',
        after: (r) => {
          const c = step(r, 'checked, n = 1000'), u = step(r, 'unchecked, n = 1000');
          return `Not any more. At 1,000 iterations the plain loop used <b>${n(c.gas)}</b> gas and the “optimised” one <b>${n(u.gas)}</b>. That is ${n(u.gas - c.gas)} gas <em>more</em> for the manual version. Since 0.8.22 the compiler removes the overflow check from a simple <code>for</code> loop counter by itself, so writing it by hand only adds instructions. Measure before you optimise. (These are read-only calls, so the figures are execution gas, without the 21,000 base cost of a transaction.)`;
        },
      },
    ],
  },
  security: {
    title: 'Security',
    h1: 'Security: four ways to lose money',
    lede: 'Each attack below was run against a real contract, then run again against the fixed version.',
    lessons: [
      {
        id: 'reentrancy',
        terms: ['reentrancy', 'revert'],
        chart: 'reentry',
        intro: () => '<code>VulnerableBank</code> sends ether <em>before</em> it sets the balance to zero. The attacker’s <code>receive()</code> runs during that send and calls <code>withdraw()</code> again, while its balance still reads 1 ETH.',
        after: (r) => {
          const bal = r.filter((x) => x.kind === 'balance');
          const ree = r.find((x) => x.call === 'reentries()');
          const alice = step(r, 'Alice tries to withdraw her 2 ETH');
          const safe = step(r, 'Mallory attacks SafeBank with 1 ETH');
          return `One transaction re-entered <b>${ree.returns}</b> times. The bank went from <b>${bal[0].returns}</b> to <b>${bal[1].returns}</b>; the attacker contract ended holding <b>${bal[2].returns}</b>, its own 1 ETH plus everyone else’s. Alice’s honest withdrawal then failed (“${alice.error.text}”). <code>SafeBank</code> zeroes the balance first (checks, effects, then interactions): the same attack reverted and it still holds <b>${bal[3].returns}</b>. Older tutorials write the vulnerable version with <code>balances[msg.sender] -= amount</code>; under 0.8 that underflows on re-entry and reverts, which hides the bug instead of showing it.`;
        },
      },
      {
        id: 'overflow',
        intro: () => 'A <code>uint8</code> holds 0 to 255. Before 0.8, 255 + 1 silently became 0. Now it reverts, unless you ask for the old behaviour with <code>unchecked</code>.',
        after: (r) => {
          const a = step(r, '255 + 1, checked');
          const reads = r.filter((x) => x.kind === 'read');
          return `The checked addition reverted with <code>${a.error.text}</code>. The unchecked one succeeded and the value wrapped from <b>${reads[0].returns}</b> to <b>${reads[1].returns}</b>. Use <code>unchecked</code> only where you can prove the value cannot overflow.`;
        },
      },
      {
        id: 'txorigin',
        terms: ['tx.origin', 'msg.sender'],
        intro: () => '<code>tx.origin</code> is the account that signed the whole transaction; <code>msg.sender</code> is whoever called this function. A wallet that trusts <code>tx.origin</code> trusts every contract its owner touches.',
        after: (r) => {
          const bal = r.filter((x) => x.kind === 'balance');
          const b = step(r, 'same trick, msg.sender check');
          return `Alice called a fake “airdrop” contract, which called her wallet. The wallet saw <code>tx.origin == Alice</code> and paid: it holds <b>${bal[0].returns}</b>. The fixed wallet checks <code>msg.sender</code>, which was the phishing contract, and refused (“${b.error.text}”); it still holds <b>${bal[1].returns}</b>.`;
        },
      },
      {
        id: 'unbounded',
        terms: ['gas'],
        intro: () => '<code>payout()</code> loops over every member and writes to each one’s credit. Every <code>join()</code> makes the next payout more expensive, and a block has a gas limit (30,000,000 on the chain used here).',
        after: (r) => {
          const p = r.filter((x) => x.call === 'payout()' && x.to === 'Unbounded');
          const last = p[p.length - 1], prev = p[p.length - 2];
          const perMember = (last.gas - prev.gas) / 150;
          const limit = Math.floor(200 + (30_000_000 - last.gas) / perMember);
          const pull = r.find((x) => x.note === 'pull payout with 200 members');
          const claim = r.find((x) => x.note === 'member 200 claims their share');
          return `Each member here is a different account, as in real use. The payout cost <b>${n(p[0].gas)}</b> gas with 1 member and <b>${n(last.gas)}</b> with 200: about <b>${n(Math.round(perMember))}</b> more for every member who joins. At that rate a payout would pass the 30,000,000 block limit at roughly <b>${n(limit)}</b> members; from then on it could not run at all, and nobody would ever be credited again. Anyone can call <code>join()</code>, so anyone can push it there. The fix, <code>PullPayout</code>, counts payout rounds and lets each member claim their own share: the payout cost <b>${n(pull.gas)}</b> gas with the same 200 members, and a claim <b>${n(claim.gas)}</b>, whatever the size of the list.`;
        },
      },
    ],
  },
};

export const EXAMPLES = {
  voting: {
    id: 'voting', title: 'Voting system', file: 'VotingSystem.sol',
    lede: 'The owner creates proposals; each address votes once.',
    after: (r) => {
      const twice = step(r, 'Bob tries to vote twice'), bad = step(r, 'a proposal that does not exist');
      const win = r.find((x) => x.call === 'getWinningProposal()');
      return `Three votes, two refusals: voting twice reverted with “${twice.error.text}”, and an index that does not exist with “${bad.error.text}”. <code>getWinningProposal()</code> returned <b>${win.returns}</b>. Note what it does with a tie: it keeps the first proposal with the most votes. And the loop in it grows with the number of proposals, like the payout on the security page.`;
    },
  },
  pets: {
    id: 'pets', title: 'Pet adoption', file: 'PetAdoption.sol',
    lede: 'The owner lists pets with a fee; anyone can adopt one by paying it, and gets any overpayment back.',
    after: (r) => {
      const little = step(r, 'Bob pays too little'), taken = step(r, 'Biscuit is taken'), over = step(r, 'Bob overpays: the rest comes back');
      const fee = Number(over.eventsRaw[0].args[2]) / 1e18, sent = Number(over.value) / 1e18;
      return `Paying ${Number(little.value) / 1e18} ETH for a ${fee} ETH pet reverted (“${little.error.text}”). Bob then sent ${sent} ETH and the contract refunded the ${+(sent - fee).toFixed(6)} ETH difference before paying the owner. Carol was too late (“${taken.error.text}”). It uses <code>transfer</code>, which forwards only 2,300 gas: if the owner were a contract with a busy <code>receive()</code>, every adoption would fail.`;
    },
  },
  payment: {
    id: 'payment', title: 'Payment for work', file: 'PaymentForWork.sol',
    lede: 'The employer deposits ether and credits workers; workers withdraw what they are owed. As written, it can promise more than it holds.',
    after: (r) => {
      const carol = step(r, 'Carol withdraws: nothing left');
      const owed = step(r, 'Carol is still owed');
      const peak = r.filter((x) => x.state).reduce((m, x) => (BigInt(x.state.owed) - BigInt(x.state.held) > BigInt(m.state.owed) - BigInt(m.state.held) ? x : m));
      return `Alice deposited ${ethOf(step(r, 'Alice deposits 1 ETH').value)}, then credited Bob and Carol. After the second credit the contract had promised <b>${ethOf(peak.state.owed)}</b> while holding <b>${ethOf(peak.state.held)}</b>, and both credits were accepted, because <code>payWorker</code> only checks that the balance covers <em>this</em> payment: <code>address(this).balance >= _amount</code>. Bob withdrew first and emptied the contract. Carol’s withdrawal reverted (${carol.error.text}: the transfer had nothing to send) and the contract still records her as owed <b>${owed.returns.replace(/^\[|, true\]$/g, '')}</b>.`;
    },
    fixed: (r) => {
      const refused = step(r, 'credit Carol 1 ETH: refused');
      return `The fix is one variable. <code>PaymentForWorkFixed</code> keeps <code>totalOwed</code> and requires <code>balance >= totalOwed + _amount</code>. The second credit is refused at the moment it is promised (“${refused.error.text}”), not when Carol tries to collect.`;
    },
  },
};
