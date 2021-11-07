//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface IRandomBox {
    function getRandomNumber(uint256 _maxNumber)
        external
        returns (uint256 result);
}
