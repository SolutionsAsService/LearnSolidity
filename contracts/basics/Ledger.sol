// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Ledger: a mapping, a struct and an event.
contract Ledger {
    struct Entry {
        uint256 amount;
        uint64 updatedAt; // block timestamp of the last change
    }

    mapping(address => Entry) public entries;

    event Recorded(address indexed who, uint256 amount);

    function record(uint256 amount) external {
        entries[msg.sender] = Entry(amount, uint64(block.timestamp));
        emit Recorded(msg.sender, amount);
    }

    function amountOf(address who) external view returns (uint256) {
        return entries[who].amount; // an unset key reads as 0, never an error
    }
}
