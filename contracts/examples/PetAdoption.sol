// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title PetAdoption
 * @dev This contract manages the process of adding pets for adoption and allows users to adopt them by paying an adoption fee.
 * The owner (deployer) of the contract can add pets, and any user can adopt a pet by paying the required fee. Excess payments are refunded.
 */
contract PetAdoption {
    // The address of the contract owner who can add pets
    address payable public owner;

    // Structure to store pet details
    struct Pet {
        uint id;              // Unique identifier for the pet
        string name;          // Name of the pet
        string species;       // Species (e.g., dog, cat) of the pet
        uint adoptionFee;     // Fee required to adopt the pet (in wei)
        bool adopted;         // Adoption status
        address adopter;      // Address of the adopter (if adopted)
    }

    // Mapping from pet id to Pet details
    mapping(uint => Pet) public pets;
    uint public petCount;

    // Events to notify off-chain applications about pet additions and adoptions
    event PetAdded(uint indexed id, string name, string species, uint adoptionFee);
    event PetAdopted(uint indexed id, address indexed adopter, uint adoptionFee);

    /**
     * @dev Sets the deployer as the contract owner
     */
    constructor() {
        owner = payable(msg.sender);
    }

    /**
     * @dev Modifier to restrict functions to the contract owner
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "Only contract owner can perform this action");
        _;
    }

    /**
     * @dev Adds a new pet to the adoption list.
     * Can only be called by the contract owner.
     * @param _name The name of the pet.
     * @param _species The species of the pet (e.g., dog, cat).
     * @param _adoptionFee The fee required to adopt the pet (in wei).
     */
    function addPet(string memory _name, string memory _species, uint _adoptionFee) public onlyOwner {
        petCount++;
        pets[petCount] = Pet(petCount, _name, _species, _adoptionFee, false, address(0));
        emit PetAdded(petCount, _name, _species, _adoptionFee);
    }

    /**
     * @dev Allows a user to adopt a pet by paying the required adoption fee.
     * If the sender pays more than the adoption fee, the excess amount is refunded.
     * @param _petId The ID of the pet to adopt.
     */
    function adoptPet(uint _petId) public payable {
        require(_petId > 0 && _petId <= petCount, "Invalid pet id");
        Pet storage pet = pets[_petId];
        require(!pet.adopted, "Pet already adopted");
        require(msg.value >= pet.adoptionFee, "Insufficient funds to adopt pet");

        // Mark the pet as adopted and record the adopter's address
        pet.adopted = true;
        pet.adopter = msg.sender;

        // Refund any excess funds sent
        if (msg.value > pet.adoptionFee) {
            payable(msg.sender).transfer(msg.value - pet.adoptionFee);
        }

        // Transfer the adoption fee to the contract owner
        owner.transfer(pet.adoptionFee);

        emit PetAdopted(_petId, msg.sender, pet.adoptionFee);
    }

    /**
     * @dev Retrieves the details of a specific pet.
     * @param _petId The ID of the pet.
     * @return A Pet struct containing the pet's details.
     */
    function getPet(uint _petId) public view returns (Pet memory) {
        require(_petId > 0 && _petId <= petCount, "Invalid pet id");
        return pets[_petId];
    }
}

