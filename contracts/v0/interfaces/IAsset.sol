//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IAssetHouse.sol";

interface IAsset {
    function traitType() external view returns (string memory);

    function randomMint(address _to) external returns (uint256);

    function getRawImage(uint256 _tokenId)
        external
        view
        returns (string memory);

    function assetTitle(uint256 _tokenId) external view returns (string memory);

    function assetHttpLink(uint256 _tokenId)
        external
        view
        returns (string memory);

    function assetCreator(uint256 _tokenId) external view returns (address);

    function assetTraits(uint256 _tokenId)
        external
        view
        returns (IAssetHouse.Trait[] memory);
}
