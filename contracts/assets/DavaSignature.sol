//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;

import "../libraries/AssetBase.sol";

contract DavaSignature is AssetBase {
    constructor(string memory frameImgUri_) AssetBase("", "", frameImgUri_) {}

    function name() public pure virtual override returns (string memory) {
        return "signature";
    }

    function assetType() public pure virtual override returns (bytes32) {
        return keccak256("dava.signature");
    }

    function zIndex() public pure virtual override returns (uint256) {
        return 70000;
    }
}
