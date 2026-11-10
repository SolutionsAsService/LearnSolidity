// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PaymentForWorkFixed
 * @dev PaymentForWork with one change: it tracks what it already owes, so it cannot promise more than it holds.
 */
contract PaymentForWorkFixed {
    address public employer;
    uint256 public totalOwed; // sum of every unpaid worker balance

    struct Worker {
        uint256 balance;
        bool isRegistered;
    }

    mapping(address => Worker) public workers;

    event WorkerRegistered(address indexed worker);
    event PaymentSent(address indexed worker, uint256 amount);
    event Withdrawn(address indexed worker, uint256 amount);

    constructor() {
        employer = msg.sender;
    }

    function registerWorker(address _worker) external {
        require(msg.sender == employer, "Only employer can register workers");
        require(!workers[_worker].isRegistered, "Worker already registered");
        workers[_worker] = Worker(0, true);
        emit WorkerRegistered(_worker);
    }

    function deposit() external payable {
        require(msg.sender == employer, "Only employer can deposit funds");
        require(msg.value > 0, "Must deposit positive amount");
    }

    function payWorker(address _worker, uint256 _amount) external {
        require(msg.sender == employer, "Only employer can pay workers");
        require(workers[_worker].isRegistered, "Worker is not registered");
        require(address(this).balance >= totalOwed + _amount, "Not enough unpromised balance");
        totalOwed += _amount;
        workers[_worker].balance += _amount;
        emit PaymentSent(_worker, _amount);
    }

    function withdraw() external {
        require(workers[msg.sender].isRegistered, "Not a registered worker");
        uint256 amount = workers[msg.sender].balance;
        require(amount > 0, "No funds available");
        workers[msg.sender].balance = 0;
        totalOwed -= amount;
        payable(msg.sender).transfer(amount);
        emit Withdrawn(msg.sender, amount);
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
