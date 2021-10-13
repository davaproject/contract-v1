//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IAvatar {
    function totalSupply() external view returns (uint256);

    function mint(address _receiver) external returns (uint256 tokenId);

    function maxAssetMintPerAvatar() external view returns (uint256);

    function mintAsset(uint256 _avatarId, address _assetContract) external;

    function safeTransferFrom(
        address _from,
        address _to,
        uint256 _tokenId
    ) external;
}
