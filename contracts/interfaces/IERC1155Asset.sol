//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

import {IERC1155} from "@openzeppelin/contracts/interfaces/IERC1155.sol";
import {IAsset} from "./IAsset.sol";

interface IERC1155Asset is IAsset, IERC1155 {
    struct Attribute {
        string traitType;
        string value;
    }

    function create(
        string calldata title_,
        address creator_,
        string calldata description_,
        string calldata uri_,
        Attribute[] calldata attributes,
        uint256 maxNum_
    ) external;

    function numberOfAssets() external view returns (uint256);

    function assetTitle(uint256 tokenId_) external view returns (string memory);

    function creator(uint256 tokenId_) external view returns (address);

    function imageUri(uint256 tokenId_) external view returns (string memory);

    function image(uint256 tokenId_) external view returns (string memory);

    function maxSupply(uint256 tokenId_) external view returns (uint256);
}
