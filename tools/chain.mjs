// A tiny local chain: an in-memory EthereumJS VM with named accounts.
// The same module runs at build time in Node (to record every figure the site prints)
// and in the browser (bundled into assets/js/chain.bundle.js for the "Run it" panels).
import { VM } from '@ethereumjs/vm';
import { Common, Chain, Hardfork } from '@ethereumjs/common';
import { LegacyTransaction } from '@ethereumjs/tx';
import { Block } from '@ethereumjs/block';
import { Address, Account, hexToBytes, bytesToHex, privateToAddress } from '@ethereumjs/util';
import { encodeFunctionData, decodeFunctionResult, encodeDeployData, decodeEventLog, decodeErrorResult } from 'viem';

export const ETH = 10n ** 18n;
const GAS_PRICE = 10n; // wei per gas; fixed so balances are reproducible
const START_BALANCE = 1000n * ETH;
export const BLOCK_GAS_LIMIT = 30_000_000n; // one block; a transaction may use all of it
const ACTORS = ['Alice', 'Bob', 'Carol', 'Dave', 'Mallory'];

export class LocalChain {
  static async create() {
    const c = new LocalChain();
    c.common = new Common({ chain: Chain.Mainnet, hardfork: Hardfork.Cancun });
    c.vm = await VM.create({ common: c.common });
    c.actors = {};
    c.names = new Map(); // lower-case address -> name
    for (const [i, name] of ACTORS.entries()) {
      const key = hexToBytes('0x' + (i + 1).toString(16).padStart(2, '0').repeat(32));
      const address = new Address(privateToAddress(key));
      await c.vm.stateManager.putAccount(address, new Account(0n, START_BALANCE));
      c.actors[name] = { name, key, address, nonce: 0n };
      c.names.set(address.toString(), name);
    }
    c.blockNumber = 1n;
    c.contracts = {};
    c.sent = 0; // every transaction sent, shown or not
    return c;
  }

  /** Make another funded account, e.g. member #57 of a growing list. */
  async addActor(name) {
    const i = Object.keys(this.actors).length + 1;
    const key = hexToBytes('0x' + i.toString(16).padStart(64, '0'));
    const address = new Address(privateToAddress(key));
    await this.vm.stateManager.putAccount(address, new Account(0n, START_BALANCE));
    this.actors[name] = { name, key, address, nonce: 0n };
    this.names.set(address.toString(), name);
    return name;
  }

  label(addr) {
    const a = String(addr).toLowerCase();
    return this.names.get(a) || a;
  }

  addressOf(name) {
    if (this.actors[name]) return this.actors[name].address.toString();
    if (this.contracts[name]) return this.contracts[name].address;
    return name;
  }

  async balance(nameOrAddr) {
    const acct = await this.vm.stateManager.getAccount(Address.fromString(this.addressOf(nameOrAddr)));
    return acct ? acct.balance : 0n;
  }

  block() {
    const n = this.blockNumber++;
    return Block.fromBlockData(
      { header: { number: n, timestamp: 1_700_000_000n + n * 12n, gasLimit: BLOCK_GAS_LIMIT, baseFeePerGas: 7n } },
      { common: this.common },
    );
  }

  async rawTx(fromName, to, data, value = 0n) {
    const actor = this.actors[fromName];
    this.sent++;
    const tx = LegacyTransaction.fromTxData(
      { nonce: actor.nonce++, gasPrice: GAS_PRICE, gasLimit: BLOCK_GAS_LIMIT, to, value, data },
      { common: this.common },
    ).sign(actor.key);
    return this.vm.runTx({ tx, block: this.block(), skipBlockGasLimitValidation: true });
  }

  /** Deploy `artifact` ({abi, bytecode}) as `alias`, sent by `fromName`. */
  async deploy(alias, artifact, fromName, args = [], value = 0n) {
    const data = encodeDeployData({ abi: artifact.abi, bytecode: artifact.bytecode, args: this.resolve(args) });
    const r = await this.rawTx(fromName, undefined, hexToBytes(data), value);
    const out = this.describe(r, artifact.abi, null, fromName, 'constructor', args, value);
    if (r.createdAddress) {
      this.contracts[alias] = { address: r.createdAddress.toString(), abi: artifact.abi };
      this.names.set(r.createdAddress.toString(), alias);
      out.address = r.createdAddress.toString();
    }
    return out;
  }

  resolve(args) {
    return args.map((a) => (typeof a === 'string' && (this.actors[a] || this.contracts[a]) ? this.addressOf(a) : a));
  }

  /** Send a transaction calling `fn` on contract `alias`. */
  async send(fromName, alias, fn, args = [], value = 0n) {
    const c = this.contracts[alias];
    const data = encodeFunctionData({ abi: c.abi, functionName: fn, args: this.resolve(args) });
    const r = await this.rawTx(fromName, Address.fromString(c.address), hexToBytes(data), value);
    return this.describe(r, c.abi, fn, fromName, fn, args, value, alias);
  }

  /** Send ether with no data to a contract or account: runs the contract's receive(). */
  async transfer(fromName, alias, value) {
    const r = await this.rawTx(fromName, Address.fromString(this.addressOf(alias)), new Uint8Array(), value);
    const abi = this.contracts[alias] ? this.contracts[alias].abi : [];
    return { ...this.describe(r, abi, null, fromName, 'send ether', [], value, alias), call: 'send ether' };
  }

  /** Read-only call (no transaction, no gas charged to anyone). */
  async read(alias, fn, args = [], fromName = 'Alice') {
    const c = this.contracts[alias];
    const data = encodeFunctionData({ abi: c.abi, functionName: fn, args: this.resolve(args) });
    // A read is an eth_call: run it, then throw the state change (including the caller's nonce) away.
    // Start cold, like a fresh eth_call: forget storage slots warmed by earlier reads.
    await this.vm.evm.journal.cleanup();
    await this.vm.stateManager.checkpoint();
    let r;
    try {
      r = await this.vm.evm.runCall({
        caller: this.actors[fromName].address,
        to: Address.fromString(c.address),
        data: hexToBytes(data),
        gasLimit: 10_000_000n,
        block: this.block(),
      });
    } finally {
      await this.vm.stateManager.revert();
      await this.vm.evm.journal.cleanup();
    }
    if (r.execResult.exceptionError) return { ok: false, error: this.decodeError(r.execResult.returnValue, c.abi) };
    const value = decodeFunctionResult({ abi: c.abi, functionName: fn, data: bytesToHex(r.execResult.returnValue) });
    return { ok: true, value, gas: r.execResult.executionGasUsed };
  }

  decodeError(bytes, abi) {
    const hex = bytesToHex(bytes);
    if (hex === '0x') return { kind: 'empty', text: 'reverted with no reason' };
    try {
      const e = decodeErrorResult({ abi, data: hex });
      if (e.errorName === 'Error') return { kind: 'require', text: e.args[0] };
      if (e.errorName === 'Panic') {
        const code = Number(e.args[0]);
        const why = { 0x11: 'arithmetic overflow or underflow', 0x12: 'division by zero', 0x32: 'array index out of bounds', 0x01: 'assert failed' }[code] || 'panic';
        return { kind: 'panic', text: `Panic(0x${code.toString(16)}): ${why}` };
      }
      return { kind: 'custom', text: `${e.errorName}(${(e.args || []).map((a) => this.fmt(a)).join(', ')})` };
    } catch {
      return { kind: 'raw', text: hex.slice(0, 74) };
    }
  }

  fmt(v) {
    // Amounts of a millionth of an ether or more are ether amounts in these lessons: show them as ETH.
    if (typeof v === 'bigint') return v >= 10n ** 12n ? `${(Number(v) / 1e18).toString()} ETH` : v.toString();
    if (typeof v === 'string' && /^0x[0-9a-fA-F]{40}$/.test(v)) return this.label(v);
    if (Array.isArray(v)) return '[' + v.map((x) => this.fmt(x)).join(', ') + ']';
    if (v && typeof v === 'object') return '{' + Object.entries(v).map(([k, x]) => `${k}: ${this.fmt(x)}`).join(', ') + '}';
    return String(v);
  }

  describe(r, abi, fn, fromName, label, args, value, alias) {
    const ok = !r.execResult.exceptionError;
    const out = {
      from: fromName,
      to: alias || null,
      call: `${label}(${args.map((a) => this.fmt(a)).join(', ')})`,
      value: value.toString(),
      ok,
      gas: Number(r.totalGasSpent),
      events: [],
      eventsRaw: [],
    };
    if (!ok) {
      out.error = this.decodeError(r.execResult.returnValue, abi);
      return out;
    }
    if (fn) {
      const item = abi.find((x) => x.type === 'function' && x.name === fn);
      if (item && item.outputs && item.outputs.length && r.execResult.returnValue.length) {
        out.returns = this.fmt(decodeFunctionResult({ abi, functionName: fn, data: bytesToHex(r.execResult.returnValue) }));
      }
    }
    const allAbis = Object.values(this.contracts).map((c) => c.abi).concat([abi]);
    for (const log of r.receipt.logs) {
      const [addr, topics, data] = log;
      let decoded = null;
      for (const a of allAbis) {
        try {
          decoded = decodeEventLog({ abi: a, topics: topics.map(bytesToHex), data: bytesToHex(data) });
          break;
        } catch {}
      }
      if (decoded) {
        const args = Array.isArray(decoded.args) ? decoded.args : Object.values(decoded.args || {});
        out.events.push(`${decoded.eventName}(${args.map((x) => this.fmt(x)).join(', ')})`);
        out.eventsRaw.push({ name: decoded.eventName, args: args.map((x) => (typeof x === 'bigint' ? x.toString() : x)) });
      }
    }
    return out;
  }
}
