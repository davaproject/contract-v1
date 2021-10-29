//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

import {IERC1155} from "@openzeppelin/contracts/interfaces/IERC1155.sol";
import {IAsset} from "./IAsset.sol";

interface IERC1155Asset is IAsset, IERC1155 {
    struct Attribute {
        string trait_type;
        string value;
    }

    function createAsset(
        bytes32 collectionType_,
        string memory title_,
        address creator_,
        string memory description_,
        string memory uri_,
        Attribute[] memory attributes_,
        uint256 maxSupply_
    ) external;

    function createCollection(
        string memory name_,
        uint256 backgroundImageTokenId_,
        uint256 foregroundImageTokenId_,
        uint256 zIndex_
    ) external;

    function numberOfAssets() external view returns (uint256);

    function collectionTitle(uint256 tokenId_)
        external
        view
        returns (string memory);

    function assetTitle(uint256 tokenId_) external view returns (string memory);

    function assetType(uint256 tokenId_) external view returns (bytes32);

    function zIndex(uint256 tokenId_) external view returns (uint256);

    function creator(uint256 tokenId_) external view returns (address);

    function imageUri(uint256 tokenId_) external view returns (string memory);

    function image(uint256 tokenId_) external view returns (string memory);

    function maxSupply(uint256 tokenId_) external view returns (uint256);
}
