// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title StorageVlad
 * @dev Stores a note (string) and an amount (uint256), retrieves both
 */
contract StorageVlad {
    string private _note;
    uint256 private _amount;

    /**
     * @dev Store a note and an amount
     * @param note The text to store
     * @param amount The number to store
     */
    function store(string memory note, uint256 amount) public {
        _note = note;
        _amount = amount;
    }

    /**
     * @dev Retrieve the stored note and amount
     * @return note The stored text
     * @return amount The stored number
     */
    function retrieve() public view returns (string memory note, uint256 amount) {
        return (_note, _amount);
    }
}
