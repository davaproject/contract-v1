//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IRandomBox.sol";

contract TestRandomBox {
    IRandomBox public randomBox;
    uint256 public randomNumber;

    constructor(IRandomBox _randomBox) {
        randomBox = _randomBox;
    }

    function getRandomNumber(uint256 _maxNumber) public {
        randomNumber = randomBox.getRandomNumber(_maxNumber);
    }
}
