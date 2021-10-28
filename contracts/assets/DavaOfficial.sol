//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;

import "../libraries/ERC1155Asset.sol";

contract DavaOfficial is ERC1155Asset {
    constructor(string memory imgServerHost_) ERC1155Asset(imgServerHost_) {}

    function name() public pure override returns (string memory) {
        return "dava-official";
    }

    function assetType() public pure override returns (bytes32) {
        return keccak256("dava.official");
    }

    function zIndex() public pure override returns (uint256) {
        return 0;
    }
}
