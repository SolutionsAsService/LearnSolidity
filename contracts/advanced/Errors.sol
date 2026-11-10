// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Two ways to refuse: a require string and a custom error.
contract RequireString {
    address public immutable owner = msg.sender;

    function guarded() external view {
        require(msg.sender == owner, "Only the owner may call this function");
    }
}

contract CustomError {
    address public immutable owner = msg.sender;

    error NotOwner(address caller);

    function guarded() external view {
        if (msg.sender != owner) revert NotOwner(msg.sender);
    }
}
