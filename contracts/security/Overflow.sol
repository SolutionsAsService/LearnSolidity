// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Overflow: checked by default since 0.8, wrapping only inside unchecked.
contract Overflow {
    uint8 public small = 255;

    function addChecked() external {
        small += 1; // reverts with Panic(0x11)
    }

    function addUnchecked() external {
        unchecked {
            small += 1; // wraps to 0
        }
    }
}
