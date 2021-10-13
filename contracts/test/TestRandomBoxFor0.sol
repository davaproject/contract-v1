//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IRandomBox.sol";

contract TestRandomBoxFor0 is IRandomBox {
    function getRandomNumber(uint256 _maxNumber)
        public
        pure
        override
        returns (uint256)
    {
        return 0;
    }
}
