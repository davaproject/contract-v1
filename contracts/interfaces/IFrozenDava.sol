//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;

interface IFrozenDava {
    function mint(
        address receiver,
        uint256 tokenId,
        uint256 originalTokenId
    ) external;

    function burn(uint256 tokenId) external;

    function tokenIdOfOriginal(uint256 tokenId) external view returns (uint256);
}
