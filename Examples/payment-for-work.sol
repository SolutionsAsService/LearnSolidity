// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PaymentForWork
 * @dev A simple contract that allows employers to deposit funds and pay workers for completed tasks.
 */
contract PaymentForWork {
    address public employer;
    
    struct Worker {
        uint256 balance; // Stores the amount earned by each worker
        bool isRegistered; // Ensures a worker is recognized in the system
    }

    mapping(address => Worker) public workers;

    event WorkerRegistered(address indexed worker);
    event PaymentSent(address indexed worker, uint256 amount);
    event Withdrawn(address indexed worker, uint256 amount);

    /**
     * @dev Contract deployer is set as the employer.
     */
    constructor() {
        employer = msg.sender;
    }

    /**
     * @dev Allows the employer to register a worker.
     * @param _worker The worker's address.
     */
    function registerWorker(address _worker) external {
        require(msg.sender == employer, "Only employer can register workers");
        require(!workers[_worker].isRegistered, "Worker already registered");

        workers[_worker] = Worker(0, true);
        emit WorkerRegistered(_worker);
    }

    /**
     * @dev Employer deposits funds to pay workers.
     */
    function deposit() external payable {
        require(msg.sender == employer, "Only employer can deposit funds");
        require(msg.value > 0, "Must deposit positive amount");
    }

    /**
     * @dev Pays a worker for completed work.
     * @param _worker The address of the worker.
     * @param _amount Amount to be credited to the worker.
     */
    function payWorker(address _worker, uint256 _amount) external {
        require(msg.sender == employer, "Only employer can pay workers");
        require(workers[_worker].isRegistered, "Worker is not registered");
        require(address(this).balance >= _amount, "Not enough contract balance");

        workers[_worker].balance += _amount;
        emit PaymentSent(_worker, _amount);
    }

    /**
     * @dev Allows a worker to withdraw their earnings.
     */
    function withdraw() external {
        require(workers[msg.sender].isRegistered, "Not a registered worker");
        require(workers[msg.sender].balance > 0, "No funds available");

        uint256 amount = workers[msg.sender].balance;
        workers[msg.sender].balance = 0;

        payable(msg.sender).transfer(amount);
        emit Withdrawn(msg.sender, amount);
    }

    /**
     * @dev Returns the contract's balance.
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
