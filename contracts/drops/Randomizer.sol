//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;

import {IRandomizer} from "./IRandomizer.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract Randomizer is IRandomizer, AccessControl {
    uint256 private _seed = 0;
    bytes internal _indexData;
    uint256 internal _indexAmount;

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function setSeed() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _seed = block.timestamp;
    }

    function setData(bytes calldata indexData_)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _indexData = indexData_;
        _indexAmount = indexData_.length;
    }

    function getIndexList(uint256 offset, uint256 amount)
        external
        view
        override
        returns (uint8[] memory)
    {
        uint8[] memory indexList = new uint8[](amount);

        for (uint256 i = 0; i < amount; i += 1) {
            indexList[i] = uint8(
                _indexData[(_seed + offset + i) % _indexAmount]
            );
        }

        return indexList;
    }
}
