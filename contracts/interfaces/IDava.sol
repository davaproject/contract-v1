//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

import {IERC721} from "@openzeppelin/contracts/interfaces/IERC721.sol";

interface IDava is IERC721 {
    function mint(address to, uint256 id) external;

    function registerAsset(address asset) external;

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
}