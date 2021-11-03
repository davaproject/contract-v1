//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

import {IERC1155} from "@openzeppelin/contracts/interfaces/IERC1155.sol";

interface IERC1155Collection is IERC1155 {
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

    function createAssetType(
        string memory name_,
        uint256 backgroundImageTokenId_,
        uint256 foregroundImageTokenId_,
        uint256 zIndex_
    ) external;

    function numberOfAssets() external view returns (uint256);

    function allAssetTypes() external view returns (bytes32[] memory);

    function imageUri(uint256 tokenId_) external view returns (string memory);

    function zIndex(uint256 tokenId_) external view returns (uint256);

    function assetType(uint256 tokenId_) external view returns (bytes32);

    function assetTypeTitle(uint256 tokenId_)
        external
        view
        returns (string memory);

    function assetTitle(uint256 tokenId_) external view returns (string memory);

    function creator(uint256 tokenId_) external view returns (address);

    function image(uint256 tokenId_) external view returns (string memory);

    function maxSupply(uint256 tokenId_) external view returns (uint256);
}