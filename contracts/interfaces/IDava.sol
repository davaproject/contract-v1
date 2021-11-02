//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

import {IERC721Enumerable} from "@openzeppelin/contracts/interfaces/IERC721Enumerable.sol";
import {IHost} from "../interfaces/IHost.sol";

interface IDava is IERC721Enumerable, IHost {
    struct ZapReq {
        address collection;
        uint256 assetId;
        uint256 amount;
    }

    function mint(address to, uint256 id) external;

    function registerCollection(address collection) external;

    function registerAssetType(address collection, bytes32 assetType) external;

    function registerDefaultCollection(address collection) external;

    function deregisterCollection(address collection) external;

    function deregisterAssetType(bytes32 assetType) external;

    function deregisterDefaultCollection(address collection) external;

    function zap(uint256 tokenId, ZapReq calldata zapReq) external;

    function zap(uint256 tokenId, ZapReq[] calldata zapReqs) external;

    function isRegisteredCollection(address collection)
        external
        view
        returns (bool);

    function isDefaultCollection(address collection)
        external
        view
        returns (bool);

    function isSupportedAssetType(bytes32 assetType)
        external
        view
        returns (bool);

    function isDavaAsset(address collection, bytes32 assetType)
        external
        view
        returns (bool);

    function getAvatar(uint256 id) external view returns (address);

    function getDefaultAsset(bytes32 collectionType)
        external
        view
        returns (
            address asset,
            string memory image,
            uint256 zIndex
        );

    function getAllSupportedAssetTypes()
        external
        view
        returns (bytes32[] memory);

    function getAllSupportedDefaultCollectionTypes()
        external
        view
        returns (bytes32[] memory);

    function getAssetTypes(address collection)
        external
        view
        returns (bytes32[] memory assetTypes);

    function getCollections(bytes32 assetType)
        external
        view
        returns (address[] memory collections);

    function getRegisteredCollections()
        external
        view
        returns (address[] memory);

    function getPFP(uint256 id) external view returns (string memory);
}
