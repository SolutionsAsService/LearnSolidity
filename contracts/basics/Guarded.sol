// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Guarded: require, revert and who is calling.
contract Guarded {
    address public immutable owner;
    uint256 public limit = 100;

    constructor() {
        owner = msg.sender;
    }

    function setLimit(uint256 newLimit) external {
        require(msg.sender == owner, "Only the owner can set the limit");
        require(newLimit > 0, "Limit must be positive");
        limit = newLimit;
    }
}
