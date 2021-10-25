//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;

import "../libraries/AssetBase.sol";

contract DavaBackground is AssetBase {
    constructor(
        string memory backgroundImgUri_,
        string memory foregroundImgUri_
    ) AssetBase(backgroundImgUri_, foregroundImgUri_, "") {}

    function name() public pure virtual override returns (string memory) {
        return "background";
    }

    function assetType() public pure virtual override returns (bytes32) {
        return keccak256("dava.background");
    }

    function zIndex() public pure virtual override returns (uint256) {
        return 10000;
    }
}
