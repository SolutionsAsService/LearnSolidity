// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Voting System
 * @dev This contract allows users to create proposals and vote on them.
 */
contract VotingSystem {
    struct Proposal {
        string name; // The name of the proposal
        uint voteCount; // Number of votes received
    }

    address public owner;
    mapping(address => bool) public hasVoted; // Tracks if an address has voted
    Proposal[] public proposals; // Array of proposals

    event ProposalCreated(string name);
    event Voted(address voter, string proposal);

    /**
     * @dev Constructor initializes the contract owner.
     */
    constructor() {
        owner = msg.sender; // Set the contract deployer as the owner
    }

    /**
     * @dev Creates a new proposal.
     * @param proposalName Name of the proposal.
     */
    function createProposal(string memory proposalName) public {
        require(msg.sender == owner, "Only owner can create proposals");
        proposals.push(Proposal({ name: proposalName, voteCount: 0 }));
        emit ProposalCreated(proposalName);
    }

    /**
     * @dev Allows users to vote for a proposal.
     * @param proposalIndex The index of the proposal in the array.
     */
    function vote(uint proposalIndex) public {
        require(!hasVoted[msg.sender], "You have already voted");
        require(proposalIndex < proposals.length, "Invalid proposal index");

        proposals[proposalIndex].voteCount++;
        hasVoted[msg.sender] = true;
        
        emit Voted(msg.sender, proposals[proposalIndex].name);
    }

    /**
     * @dev Returns the winning proposal.
     * @return winningName The name of the proposal with the most votes.
     */
    function getWinningProposal() public view returns (string memory winningName) {
        require(proposals.length > 0, "No proposals available");

        uint winningVoteCount = 0;
        uint winningIndex = 0;

        for (uint i = 0; i < proposals.length; i++) {
            if (proposals[i].voteCount > winningVoteCount) {
                winningVoteCount = proposals[i].voteCount;
                winningIndex = i;
            }
        }

        return proposals[winningIndex].name;
    }
}
