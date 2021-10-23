//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

interface IAsset {
    function assetType() external view returns (bytes32);
}
