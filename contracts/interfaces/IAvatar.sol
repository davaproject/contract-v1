//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

struct Asset {
    address assetAddr;
    uint256 id;
}

interface IAvatar {
    function setName(string memory name_) external;

    function putOn(Asset memory asset_) external;

    function takeOff(bytes32 assetType) external;

    function name() external view returns (string memory);

    function version() external view returns (string memory);

    function dava() external view returns (address);

    function asset(bytes32 assetType) external view returns (Asset memory);

    function allAssets() external view returns (Asset[] memory assets);

    function getPFP() external view returns (string memory);
}
