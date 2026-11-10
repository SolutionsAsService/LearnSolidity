// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title An unbounded loop: every new member makes payout() cost more.
contract Unbounded {
    address[] public members;
    mapping(address => uint256) public credit;

    function join() external {
        members.push(msg.sender);
    }

    function payout() external {
        for (uint256 i = 0; i < members.length; i++) {
            credit[members[i]] += 1;
        }
    }
}

/// @title The fix: pay out by bookkeeping, and let each member pull their own share.
/// payout() is one storage write however many members there are; claim() touches only the caller.
contract PullPayout {
    mapping(address => bool) public isMember;
    mapping(address => uint256) public claimedRounds;
    uint256 public rounds;
    mapping(address => uint256) public credit;

    function join() external {
        require(!isMember[msg.sender], "Already a member");
        isMember[msg.sender] = true;
        claimedRounds[msg.sender] = rounds; // only rounds after joining count
    }

    function payout() external {
        rounds += 1;
    }

    function claim() external {
        require(isMember[msg.sender], "Not a member");
        credit[msg.sender] += rounds - claimedRounds[msg.sender];
        claimedRounds[msg.sender] = rounds;
    }
}
