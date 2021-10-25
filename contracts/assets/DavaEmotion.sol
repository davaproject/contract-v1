//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "../libraries/AssetBase.sol";

contract DavaEmotion is AssetBase {
    struct Emotion {
        uint256 happy;
        uint256 anger;
        uint256 surprise;
        uint256 fear;
        uint256 sad;
        uint256 disgust;
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

    function trait(uint256 tokenId) public view returns (Emotion memory) {
        //
    }

    function name() public pure virtual override returns (string memory) {
        return "emotion";
    }

    function assetType() public pure virtual override returns (bytes32) {
        return
            keccak256(
                "Emotion(uint256 happy,uint256 anger,uint256 surprise,uint256 fear,uint256 sad,uint256 disgust)"
            );
    }

    function zIndex() public pure virtual override returns (uint256) {
        return 10;
    }
}
