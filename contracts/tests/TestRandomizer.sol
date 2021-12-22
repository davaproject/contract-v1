//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;

import {Randomizer} from "../drops/Randomizer.sol";

contract TestRandomizer is Randomizer {
    constructor() Randomizer() {}

    function indexData() external view returns (bytes memory) {
        return _indexData;
    }

    function indexAmount() external view returns (uint256) {
        return _indexAmount;
    }
}
