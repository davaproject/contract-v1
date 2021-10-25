//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface IRandomBox {
    function getRandomNumber(uint256 maxNumber) external returns (uint256);
}
