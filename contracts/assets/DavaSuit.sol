//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "../libraries/AssetBase.sol";

contract DavaSuit is AssetBase {
    struct Suit {
        uint256 sort;
    }

    constructor() AssetBase("ipfs://ERC1155-name-description-thumbnail-uri") {}

    function trait(uint256 tokenId) public view returns (Suit memory) {
        //
    }

    function name() public pure virtual override returns (string memory) {
        return "suit";
    }

    function assetType() public pure virtual override returns (bytes32) {
        return keccak256("Suit(uint256 sort)");
    }

    function zIndex() public pure virtual override returns (uint256) {
        return 10000;
    }
}
