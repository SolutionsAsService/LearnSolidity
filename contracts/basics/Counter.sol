// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Counter: one number stored on chain.
/// @notice State lives in storage; reading it is free, changing it costs gas.
contract Counter {
    uint256 public count; // starts at 0

    function increment() external {
        count += 1;
    }

    function reset() external {
        count = 0;
    }
}
