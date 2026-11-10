// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Inheritance, an abstract contract and an interface.
interface IGreeter {
    function greet() external view returns (string memory);
}

abstract contract Owned {
    address public owner = msg.sender;

    error NotOwner();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
}

contract Greeter is Owned, IGreeter {
    string private greeting = "gm";

    function setGreeting(string calldata g) external onlyOwner {
        greeting = g;
    }

    function greet() external view override returns (string memory) {
        return greeting;
    }
}
