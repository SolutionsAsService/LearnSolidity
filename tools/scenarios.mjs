// Every lesson's scripted run. Each step's gas, result, events and revert reason are recorded
// by build.mjs into data/runs.json; the pages print nothing that is not in that file.
import { ETH } from './chain.mjs';

const eth = (n) => BigInt(Math.round(n * 1000)) * ETH / 1000n;

export const SCENARIOS = [
  {
    id: 'counter', file: 'basics/Counter.sol', title: 'A number that lives on chain',
    async run(t) {
      await t.deploy('Counter', 'Counter', 'Alice');
      await t.send('Alice', 'Counter', 'increment', [], 0n, 'first write: 0 → 1');
      await t.send('Alice', 'Counter', 'increment', [], 0n, 'second write: 1 → 2');
      await t.read('Counter', 'count');
      await t.send('Bob', 'Counter', 'reset', [], 0n, 'back to zero: refund');
      await t.read('Counter', 'count');
    },
  },
  {
    id: 'ledger', file: 'basics/Ledger.sol', title: 'Mappings, structs and events',
    async run(t) {
      await t.deploy('Ledger', 'Ledger', 'Alice');
      await t.send('Alice', 'Ledger', 'record', [42n]);
      await t.send('Bob', 'Ledger', 'record', [7n]);
      await t.read('Ledger', 'amountOf', ['Alice']);
      await t.read('Ledger', 'amountOf', ['Carol'], 'an address that never wrote');
    },
  },
  {
    id: 'guarded', file: 'basics/Guarded.sol', title: 'require: saying no',
    async run(t) {
      await t.deploy('Guarded', 'Guarded', 'Alice');
      await t.send('Bob', 'Guarded', 'setLimit', [500n], 0n, 'not the owner');
      await t.send('Alice', 'Guarded', 'setLimit', [0n], 0n, 'owner, bad value');
      await t.send('Alice', 'Guarded', 'setLimit', [500n], 0n, 'owner, good value');
      await t.read('Guarded', 'limit');
    },
  },
  {
    id: 'piggy', file: 'basics/PiggyBank.sol', title: 'Receiving and sending ether',
    async run(t) {
      await t.deploy('PiggyBank', 'PiggyBank', 'Alice');
      await t.transfer('Bob', 'PiggyBank', eth(1), 'Bob sends 1 ETH');
      await t.transfer('Carol', 'PiggyBank', eth(0.5), 'Carol sends 0.5 ETH');
      await t.balance('PiggyBank');
      await t.send('Bob', 'PiggyBank', 'smash', [], 0n, 'Bob tries to smash it');
      await t.send('Alice', 'PiggyBank', 'smash', [], 0n, 'the owner smashes it');
      await t.balance('PiggyBank');
    },
  },
  {
    id: 'errors', file: 'advanced/Errors.sol', title: 'Custom errors are cheaper',
    async run(t) {
      await t.deploy('RequireString', 'RequireString', 'Alice');
      await t.deploy('CustomError', 'CustomError', 'Alice');
      await t.send('Bob', 'RequireString', 'guarded', [], 0n, 'refused with a string');
      await t.send('Bob', 'CustomError', 'guarded', [], 0n, 'refused with a custom error');
    },
    compare: [['deploy RequireString', 'deploy CustomError'], ['refused with a string', 'refused with a custom error']],
  },
  {
    id: 'packing', file: 'advanced/Packing.sol', title: 'Pack your storage',
    async run(t) {
      await t.deploy('Loose', 'Loose', 'Alice');
      await t.deploy('Packed', 'Packed', 'Alice');
      await t.send('Alice', 'Loose', 'setAll', [1n, 2n, 3n], 0n, 'three slots');
      await t.send('Alice', 'Packed', 'setAll', [1n, 2n, 3n], 0n, 'one slot');
    },
    compare: [['three slots', 'one slot']],
  },
  {
    id: 'inheritance', file: 'advanced/Inheritance.sol', title: 'Inheritance and interfaces',
    async run(t) {
      await t.deploy('Greeter', 'Greeter', 'Alice');
      await t.read('Greeter', 'greet');
      await t.send('Bob', 'Greeter', 'setGreeting', ['hello'], 0n, 'onlyOwner from Owned');
      await t.send('Alice', 'Greeter', 'setGreeting', ['hello'], 0n);
      await t.read('Greeter', 'greet');
    },
  },
  {
    id: 'loops', file: 'advanced/Loops.sol', title: 'unchecked in loops',
    async run(t) {
      await t.deploy('Loops', 'Loops', 'Alice');
      for (const n of [10n, 100n, 1000n]) {
        await t.read('Loops', 'sumChecked', [n], `checked, n = ${n}`);
        await t.read('Loops', 'sumUnchecked', [n], `unchecked, n = ${n}`);
      }
    },
  },
  {
    id: 'reentrancy', file: 'security/Reentrancy.sol', title: 'Reentrancy: paying before bookkeeping',
    async run(t) {
      await t.deploy('VulnerableBank', 'VulnerableBank', 'Alice');
      for (const who of ['Alice', 'Bob', 'Carol', 'Dave']) await t.send(who, 'VulnerableBank', 'deposit', [], eth(2), `${who} deposits 2 ETH`);
      await t.balance('VulnerableBank', 'bank holds');
      await t.deploy('Attacker', 'Attacker', 'Mallory', ['VulnerableBank']);
      await t.send('Mallory', 'Attacker', 'attack', [], eth(1), 'Mallory attacks with 1 ETH');
      await t.read('Attacker', 'reentries');
      await t.balance('VulnerableBank', 'bank holds');
      await t.balance('Attacker', 'attacker holds');
      await t.send('Alice', 'VulnerableBank', 'withdraw', [], 0n, 'Alice tries to withdraw her 2 ETH');
      // the same attack against the checks-effects-interactions version
      await t.deploy('SafeBank', 'SafeBank', 'Alice');
      for (const who of ['Alice', 'Bob', 'Carol', 'Dave']) await t.send(who, 'SafeBank', 'deposit', [], eth(2), `${who} deposits 2 ETH`);
      await t.deploy('Attacker (2nd)', 'Attacker', 'Mallory', ['SafeBank']);
      await t.send('Mallory', 'Attacker (2nd)', 'attack', [], eth(1), 'Mallory attacks SafeBank with 1 ETH');
      await t.balance('SafeBank', 'safe bank holds');
    },
  },
  {
    id: 'overflow', file: 'security/Overflow.sol', title: 'Overflow is checked',
    async run(t) {
      await t.deploy('Overflow', 'Overflow', 'Alice');
      await t.read('Overflow', 'small');
      await t.send('Alice', 'Overflow', 'addChecked', [], 0n, '255 + 1, checked');
      await t.send('Alice', 'Overflow', 'addUnchecked', [], 0n, '255 + 1, unchecked');
      await t.read('Overflow', 'small');
    },
  },
  {
    id: 'txorigin', file: 'security/TxOrigin.sol', title: 'tx.origin is not the caller',
    async run(t) {
      await t.deploy('OriginWallet', 'OriginWallet', 'Alice');
      await t.transfer('Alice', 'OriginWallet', eth(5), 'Alice funds her wallet');
      await t.deploy('Phisher', 'Phisher', 'Mallory');
      await t.send('Alice', 'Phisher', 'claimAirdrop', ['OriginWallet'], 0n, 'Alice "claims an airdrop"');
      await t.balance('OriginWallet', 'wallet holds');
      await t.deploy('SenderWallet', 'SenderWallet', 'Alice');
      await t.transfer('Alice', 'SenderWallet', eth(5), 'Alice funds the fixed wallet');
      await t.send('Alice', 'Phisher', 'claimAirdrop', ['SenderWallet'], 0n, 'same trick, msg.sender check');
      await t.balance('SenderWallet', 'fixed wallet holds');
    },
  },
  {
    id: 'unbounded', file: 'security/Unbounded.sol', title: 'Loops that grow',
    async run(t) {
      await t.deploy('Unbounded', 'Unbounded', 'Alice');
      await t.send('Alice', 'Unbounded', 'join', [], 0n, 'member 1 joins');
      await t.send('Alice', 'Unbounded', 'payout', [], 0n, 'payout with 1 member');
      let members = 1;
      for (const size of [10, 50, 200]) {
        while (members < size) {
          members++;
          const who = await t.addActor(`Member${members}`);
          await t.send(who, 'Unbounded', 'join', [], 0n, null, true);
        }
        t.setup(`members ${size === 10 ? 2 : size === 50 ? 11 : 51} to ${size} join (one join() each, not listed)`);
        await t.send('Alice', 'Unbounded', 'payout', [], 0n, `payout with ${size} members`);
      }
      // the fix: same members, pull payments
      await t.deploy('PullPayout', 'PullPayout', 'Alice');
      await t.send('Alice', 'PullPayout', 'join', [], 0n, 'member 1 joins');
      for (let m = 2; m <= 200; m++) await t.send(`Member${m}`, 'PullPayout', 'join', [], 0n, null, true);
      t.setup('members 2 to 200 join (not listed)');
      await t.send('Alice', 'PullPayout', 'payout', [], 0n, 'pull payout with 200 members');
      await t.send('Member200', 'PullPayout', 'claim', [], 0n, 'member 200 claims their share');
      await t.read('PullPayout', 'credit', ['Member200'], 'member 200 is credited');
    },
  },
  {
    id: 'voting', file: 'examples/VotingSystem.sol', title: 'Voting system', example: true,
    async run(t) {
      await t.deploy('VotingSystem', 'VotingSystem', 'Alice');
      await t.send('Alice', 'VotingSystem', 'createProposal', ['Build a park']);
      await t.send('Alice', 'VotingSystem', 'createProposal', ['Fix the roads']);
      await t.send('Bob', 'VotingSystem', 'createProposal', ['Bob for mayor'], 0n, 'only the owner may add');
      await t.send('Bob', 'VotingSystem', 'vote', [1n]);
      await t.send('Carol', 'VotingSystem', 'vote', [1n]);
      await t.send('Dave', 'VotingSystem', 'vote', [0n]);
      await t.send('Bob', 'VotingSystem', 'vote', [0n], 0n, 'Bob tries to vote twice');
      await t.send('Mallory', 'VotingSystem', 'vote', [9n], 0n, 'a proposal that does not exist');
      await t.read('VotingSystem', 'getWinningProposal');
    },
  },
  {
    id: 'pets', file: 'examples/PetAdoption.sol', title: 'Pet adoption', example: true,
    async run(t) {
      await t.deploy('PetAdoption', 'PetAdoption', 'Alice');
      await t.send('Alice', 'PetAdoption', 'addPet', ['Biscuit', 'dog', eth(0.1)]);
      await t.send('Alice', 'PetAdoption', 'addPet', ['Miso', 'cat', eth(0.05)]);
      await t.send('Bob', 'PetAdoption', 'adoptPet', [1n], eth(0.05), 'Bob pays too little');
      await t.send('Bob', 'PetAdoption', 'adoptPet', [1n], eth(0.25), 'Bob overpays: the rest comes back');
      await t.send('Carol', 'PetAdoption', 'adoptPet', [1n], eth(0.1), 'Biscuit is taken');
      await t.read('PetAdoption', 'getPet', [1n]);
    },
  },
  {
    id: 'payment', file: 'examples/PaymentForWork.sol', title: 'Payment for work, as written', example: true,
    async run(t) {
      await t.deploy('PaymentForWork', 'PaymentForWork', 'Alice');
      t.track = async (chain) => {
        const held = await chain.balance('PaymentForWork');
        let owed = 0n;
        for (const w of ['Bob', 'Carol']) { const r = await chain.read('PaymentForWork', 'workers', [w]); owed += r.value[0]; }
        return { held: held.toString(), owed: owed.toString() };
      };
      await t.send('Alice', 'PaymentForWork', 'registerWorker', ['Bob']);
      await t.send('Alice', 'PaymentForWork', 'registerWorker', ['Carol']);
      await t.send('Alice', 'PaymentForWork', 'deposit', [], eth(1), 'Alice deposits 1 ETH');
      await t.send('Alice', 'PaymentForWork', 'payWorker', ['Bob', eth(1)], 0n, 'credit Bob 1 ETH');
      await t.send('Alice', 'PaymentForWork', 'payWorker', ['Carol', eth(1)], 0n, 'credit Carol 1 ETH too: accepted');
      await t.send('Bob', 'PaymentForWork', 'withdraw', [], 0n, 'Bob withdraws');
      await t.send('Carol', 'PaymentForWork', 'withdraw', [], 0n, 'Carol withdraws: nothing left');
      await t.read('PaymentForWork', 'workers', ['Carol'], 'Carol is still owed');
    },
  },
  {
    id: 'paymentfixed', file: 'examples/PaymentForWorkFixed.sol', title: 'Payment for work, fixed', example: true,
    async run(t) {
      await t.deploy('PaymentForWorkFixed', 'PaymentForWorkFixed', 'Alice');
      t.track = async (chain) => {
        const held = await chain.balance('PaymentForWorkFixed');
        let owed = 0n;
        for (const w of ['Bob', 'Carol']) { const r = await chain.read('PaymentForWorkFixed', 'workers', [w]); owed += r.value[0]; }
        return { held: held.toString(), owed: owed.toString() };
      };
      await t.send('Alice', 'PaymentForWorkFixed', 'registerWorker', ['Bob']);
      await t.send('Alice', 'PaymentForWorkFixed', 'registerWorker', ['Carol']);
      await t.send('Alice', 'PaymentForWorkFixed', 'deposit', [], eth(1), 'Alice deposits 1 ETH');
      await t.send('Alice', 'PaymentForWorkFixed', 'payWorker', ['Bob', eth(1)], 0n, 'credit Bob 1 ETH');
      await t.send('Alice', 'PaymentForWorkFixed', 'payWorker', ['Carol', eth(1)], 0n, 'credit Carol 1 ETH: refused');
      await t.send('Bob', 'PaymentForWorkFixed', 'withdraw', [], 0n, 'Bob withdraws');
    },
  },
];
