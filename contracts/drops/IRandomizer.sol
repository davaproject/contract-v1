//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface IRandomizer {
    function getIndexList(uint256 offset, uint256 amount)
        external
        view
        returns (uint8[] memory indexList);
}
