//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

interface IAsset {
    struct OnchainTrait {
        string traitType;
        string value;
    }

    function create(
        string calldata title_,
        address creator_,
        string calldata description_,
        string calldata uri_,
        OnchainTrait[] calldata attributes,
        uint256 maxNum_
    ) external;

    function numberOfAssets() external view returns (uint256);

    function name() external pure returns (string memory);

    function assetType() external pure returns (bytes32);

    function zIndex() external pure returns (uint256);

    function creator(uint256 tokenId_) external view returns (address);

    function imageUri(uint256 tokenId_) external view returns (string memory);

    function image(uint256 tokenId_) external view returns (string memory);

    function maxSupply(uint256 tokenId_) external view returns (uint256);
}
