//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "../libraries/AssetBase.sol";

contract DavaSuitAddOn is AssetBase {
    struct SuitAddOn {
        uint256 value;
    }

    constructor(
        string[] memory lowerIndexSVGs_,
        string[] memory upperIndexSVGs_
    )
        AssetBase(
            "ipfs://ERC1155-name-description-thumbnail-uri",
            lowerIndexSVGs_,
            upperIndexSVGs_
        )
    {}

    function trait(uint256 tokenId) public view returns (SuitAddOn memory) {
        //
    }

    function name() public pure virtual override returns (string memory) {
        return "suit-addon";
    }

    function assetType() public pure virtual override returns (bytes32) {
        return keccak256("SuitAddOn(uint256 value)");
    }

    function zIndex() public pure virtual override returns (uint256) {
        return 100000;
    }
}
