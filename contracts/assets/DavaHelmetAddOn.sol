//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "../libraries/AssetBase.sol";

contract DavaHelmetAddOn is AssetBase {
    struct HelmetAddOn {
        uint256 value;
    }

    constructor() AssetBase("ipfs://ERC1155-name-description-thumbnail-uri") {}

    function trait(uint256 tokenId) public view returns (HelmetAddOn memory) {
        //
    }

    function name() public pure virtual override returns (string memory) {
        return "helmet-addon";
    }

    function assetType() public pure virtual override returns (bytes32) {
        return keccak256("HelmetAddOn(uint256 value)");
    }

    function zIndex() public pure virtual override returns (uint256) {
        return 1000;
    }
}
