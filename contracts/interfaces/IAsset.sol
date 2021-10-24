//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

interface IAsset {
    function create(string memory uri_, uint256 maxNum_) external;

    function numberOfAssets() external view returns (uint256);

    function name() external pure returns (string memory);

    function assetType() external pure returns (bytes32);

    function zIndex() external pure returns (uint256);

    function creator(uint256 tokenId_) external view returns (address);

    function image(uint256 tokenId_) external view returns (string memory);

    function maxSupply(uint256 tokenId_) external view returns (uint256);
}
