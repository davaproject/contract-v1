//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

import "@openzeppelin/contracts/utils/Strings.sol";
import "../interfaces/IAsset.sol";
import "../libraries/AvatarBase.sol";
import "../libraries/OnchainMetadata.sol";
import "../libraries/QuickSort.sol";

// TODO: ipfs router contract
contract AvatarV1 is AvatarBase {
    using Strings for uint256;

    function version() public pure override returns (string memory) {
        return "V1";
    }

    function getPFP() external view override returns (string memory) {
        Asset[] memory assets = allAssets();
        QuickSort.Layer[] memory layers = new QuickSort.Layer[](assets.length);

        for (uint256 i = 0; i < assets.length; i += 1) {
            string memory image = IAsset(assets[i].assetAddr).image(
                assets[i].id
            );
            uint256 zIndex = IAsset(assets[i].assetAddr).zIndex();

            layers[i] = QuickSort.Layer(image, zIndex);
        }

        QuickSort.sort(layers, int256(0), int256(assets.length - 1));

        string[] memory imgURIs = new string[](assets.length);
        for (uint256 i = 0; i < assets.length; i += 1) {
            imgURIs[i] = layers[i].imgUri;
        }

        return OnchainMetadata.compileImages(imgURIs);
    }
}
