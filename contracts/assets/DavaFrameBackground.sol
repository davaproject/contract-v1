//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;

import {DefaultImageAsset} from "../libraries/DefaultImageAsset.sol";

contract DavaFrameBackground is DefaultImageAsset {
    constructor(string memory defaultImage_) DefaultImageAsset(defaultImage_) {}

    function name() public pure override returns (string memory) {
        return "frame-background";
    }

    function assetTypes() public pure override returns (bytes32[] memory) {
        return new bytes32[](0);
    }

    function collectionType() public pure override returns (bytes32) {
        return keccak256("dava.framebackground");
    }

    function zIndex() public pure override returns (uint256) {
        return 5000;
    }
}
