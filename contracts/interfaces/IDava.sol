//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

import {IERC721Enumerable} from "@openzeppelin/contracts/interfaces/IERC721Enumerable.sol";

interface IDava is IERC721Enumerable {
    function mint(address to, uint256 id) external;

    function registerAsset(address asset) external;

    function registerDefaultAsset(address asset) external;

    function deregisterAsset(address asset) external;

    function isDavaAsset(address asset) external view returns (bool);

    function getAvatar(uint256 id) external view returns (address);

    function getAllAssets(bytes32 assetType)
        external
        view
        returns (address[] memory);

    function getAllSupportedAssetTypes()
        external
        view
        returns (bytes32[] memory);

    function getPFP(uint256 id) external view returns (string memory);

    function getDefaultImage(bytes32 assetType)
        external
        view
        returns (string memory);
}
