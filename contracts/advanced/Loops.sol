// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Checked and unchecked arithmetic in a loop.
contract Loops {
    function sumChecked(uint256 n) external pure returns (uint256 s) {
        for (uint256 i = 0; i < n; i++) {
            s += i;
        }
    }

    function sumUnchecked(uint256 n) external pure returns (uint256 s) {
        for (uint256 i = 0; i < n; ) {
            s += i;
            unchecked {
                ++i; // i < n, so it cannot overflow
            }
        }
    }
}
