//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ILayerHouse {
    struct Layer {
        address asset;
        bool hasDefault;
        uint256 assetId;
    }

    function layerAmountOf(address) external view returns (uint256);

    function layersOf(address) external view returns (Layer[] memory);
}
