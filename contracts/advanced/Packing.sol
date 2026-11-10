// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Storage packing: the same three fields, two layouts.
contract Loose {
    uint256 public a; // slot 0
    uint256 public b; // slot 1
    uint256 public c; // slot 2

    function setAll(uint256 x, uint256 y, uint256 z) external {
        a = x;
        b = y;
        c = z;
    }
}

contract Packed {
    uint64 public a; // slot 0, bytes 0-7
    uint64 public b; // slot 0, bytes 8-15
    uint128 public c; // slot 0, bytes 16-31

    function setAll(uint64 x, uint64 y, uint128 z) external {
        a = x;
        b = y;
        c = z;
    }
}
