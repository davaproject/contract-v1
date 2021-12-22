//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;

import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {IERC1155} from "@openzeppelin/contracts/interfaces/IERC1155.sol";
import {IRandomizer} from "../drops/IRandomizer.sol";
import {Drops} from "../drops/Drops.sol";

contract TestDrops is Drops {
    using EnumerableSet for EnumerableSet.UintSet;

    constructor(IERC1155 erc1155_, IRandomizer randomizer_)
        Drops(erc1155_, randomizer_)
    {}

    function partsId(uint256 index_) external view returns (uint256) {
        return _partsIds.at(index_);
    }

    function totalPartsIds() external view returns (uint256) {
        return _partsIds.length();
    }
}
