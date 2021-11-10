//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

import {IERC1155} from "@openzeppelin/contracts/interfaces/IERC1155.sol";

interface IPartCollection is IERC1155 {
    struct Attribute {
        string trait_type;
        string value;
    }

    function createPart(
        bytes32 partType_,
        string memory title_,
        string memory description_,
        string memory uri_,
        Attribute[] memory attributes_,
        uint256 maxSupply_
    ) external;

    function createPartType(
        string memory name_,
        uint256 backgroundImageTokenId_,
        uint256 foregroundImageTokenId_,
        uint256 zIndex_
    ) external;

    function dava() external view returns (address);

    function numberOfParts() external view returns (uint256);

    function description(uint256 tokenId) external view returns (string memory);

    function imageUri(uint256 tokenId_) external view returns (string memory);

    function zIndex(uint256 tokenId_) external view returns (uint256);

    function partTypeInfo(bytes32 partType_)
        external
        view
        returns (
            string memory name_,
            uint256 backgroundImgTokenId_,
            uint256 foregroundImgTokenId_,
            uint256 zIndex_
        );

    function partType(uint256 tokenId_) external view returns (bytes32);

    function partTypeTitle(uint256 tokenId_)
        external
        view
        returns (string memory);

    function partTitle(uint256 tokenId_) external view returns (string memory);

    function image(uint256 tokenId_) external view returns (string memory);

    function maxSupply(uint256 tokenId_) external view returns (uint256);
}
