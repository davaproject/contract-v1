//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;

import "../libraries/ERC1155Asset.sol";

contract DavaSuitAddOn is ERC1155Asset {
    constructor(
        string memory backgroundImgUri_,
        string memory foregroundImgUri_
    ) ERC1155Asset(backgroundImgUri_, foregroundImgUri_, "") {}

    function name() public pure virtual override returns (string memory) {
        return "suit-addon";
    }

    function assetType() public pure virtual override returns (bytes32) {
        return keccak256("dava.suitaddon");
    }

    function zIndex() public pure virtual override returns (uint256) {
        return 20000;
    }
}
