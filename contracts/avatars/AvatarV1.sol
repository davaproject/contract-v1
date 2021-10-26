//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

import "@openzeppelin/contracts/utils/Strings.sol";
import "../interfaces/IERC1155Asset.sol";
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
        return OnchainMetadata.compileImages(_imgURIs());
    }

    function getMetadata() external view override returns (string memory) {
        Asset[] memory assets = allAssets();

        IERC1155Asset.Attribute[]
            memory attributes = new IERC1155Asset.Attribute[](assets.length);

        uint256 wearingAssetAmount = 0;
        for (uint256 i = 0; i < assets.length; i += 1) {
            if (assets[i].assetAddr != address(0x0)) {
                string memory name = IAsset(assets[i].assetAddr).name();
                string memory assetTitle = IERC1155Asset(assets[i].assetAddr)
                    .assetTitle(assets[i].id);

                attributes[wearingAssetAmount] = IERC1155Asset.Attribute(
                    name,
                    assetTitle
                );
                wearingAssetAmount += 1;
            }
        }

        IERC1155Asset.Attribute[]
            memory wearingAttributes = new IERC1155Asset.Attribute[](
                wearingAssetAmount
            );

        for (uint256 i = 0; i < wearingAssetAmount; i += 1) {
            wearingAttributes[i] = attributes[i];
        }

        return
            OnchainMetadata.toMetadata(
                name(),
                address(0x0),
                "Genesis Avatar",
                _imgURIs(),
                wearingAttributes
            );
    }

    function _imgURIs() private view returns (string[] memory) {
        Asset[] memory assets = allAssets();
        QuickSort.Layer[] memory layers = new QuickSort.Layer[](assets.length);

        for (uint256 i = 0; i < assets.length; i += 1) {
            string memory img;
            uint256 zIndex;
            if (assets[i].assetAddr == address(0x0)) {
                (img, zIndex) = IDava(dava()).getDefaultAsset(
                    assets[i].assetType
                );
            } else {
                img = IERC1155Asset(assets[i].assetAddr).imageUri(assets[i].id);
                zIndex = IERC1155Asset(assets[i].assetAddr).zIndex();
            }
            if (bytes(img).length == 0) {
                layers[i] = QuickSort.Layer("", 2**256 - 1 - i);
            } else {
                layers[i] = QuickSort.Layer(img, zIndex);
            }
        }

        if (assets.length > 1) {
            QuickSort.sort(layers, int256(0), int256(assets.length - 1));
        }

        string[] memory imgURIs = new string[](assets.length);
        for (uint256 i = 0; i < assets.length; i += 1) {
            imgURIs[i] = layers[i].imgUri;
        }

        return imgURIs;
    }
}
