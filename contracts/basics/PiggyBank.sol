// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title PiggyBank: receiving and sending ether.
contract PiggyBank {
    address payable public immutable owner;

    event Deposited(address indexed from, uint256 amount);

    constructor() {
        owner = payable(msg.sender);
    }

    receive() external payable {
        emit Deposited(msg.sender, msg.value);
    }

    function smash() external {
        require(msg.sender == owner, "Not your piggy bank");
        (bool ok, ) = owner.call{value: address(this).balance}("");
        require(ok, "Transfer failed");
    }
}
