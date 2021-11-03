//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;

import {IERC1155Collection} from "../interfaces/IERC1155Collection.sol";
import {OnchainMetadata} from "../libraries/OnchainMetadata.sol";

contract TestOnchainMetadata {
    function toMetadata(
        string memory name,
        address creator,
        string memory description,
        string[] memory imgURIs,
        string memory externalImgUri,
        IERC1155Collection.Attribute[] memory attributes
    ) external pure returns (string memory) {
        return
            OnchainMetadata.toMetadata(
                name,
                creator,
                description,
                imgURIs,
                externalImgUri,
                attributes
            );
    }

    function compileImages(string[] memory imgURIs)
        external
        pure
        returns (string memory)
    {
        return OnchainMetadata.compileImages(imgURIs);
    }

    function toSVGImage(string memory imgUri)
        external
        pure
        returns (string memory)
    {
        return OnchainMetadata.toSVGImage(imgUri);
    }
}
