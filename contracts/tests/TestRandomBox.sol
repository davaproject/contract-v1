//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;

import {RandomBox} from "../sales/RandomBox.sol";

contract TestRandomBox is RandomBox {
    function aPartIds(uint256 index) external view returns (bytes32) {
        return _aPartIds[index];
    }

    function bPartIds(uint256 index) external view returns (bytes32) {
        return _bPartIds[index];
    }

    function cPartIds(uint256 index) external view returns (bytes32) {
        return _cPartIds[index];
    }

    function seed() external view returns (uint256) {
        return _seed;
    }
}
