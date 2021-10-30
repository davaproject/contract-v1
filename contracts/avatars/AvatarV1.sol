//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

import "@openzeppelin/contracts/utils/Strings.sol";
import "../interfaces/IERC1155Asset.sol";
import "../libraries/ImageHost.sol";
import {IImageHost} from "../interfaces/IImageHost.sol";
import {ITransferableAsset} from "../interfaces/IAsset.sol";
import "../libraries/AvatarBase.sol";
import "../libraries/OnchainMetadata.sol";
import "../libraries/QuickSort.sol";

// TODO: ipfs router contract
contract AvatarV1 is AvatarBase {
    using Strings for uint256;

    function dress(Asset[] calldata assets) external override onlyOwner {
        for (uint256 i = 0; i < assets.length; i += 1) {
            if (assets[i].assetAddr == address(0x0)) {
                Asset memory equippedAsset = _props().assets[
                    assets[i].assetType
                ];
                if (equippedAsset.assetAddr != address(0x0)) {
                    ITransferableAsset(equippedAsset.assetAddr)
                        .safeTransferFrom(
                            address(this),
                            msg.sender,
                            equippedAsset.id,
                            1,
                            ""
                        );
                    _takeOff(assets[i].assetType);
                }
            } else {
                if (!_isEligible(assets[i])) {
                    IDava(dava()).transferAssetToAvatar(
                        _props().davaId,
                        assets[i].assetAddr,
                        assets[i].id,
                        1
                    );
                }
                _putOn(assets[i]);
            }
        }
    }

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

        QuickSort.Layer[] memory layers = new QuickSort.Layer[](assets.length);

        ImageHost.Query[] memory queries = new ImageHost.Query[](assets.length);

        uint256 wearingAssetAmount = 0;
        uint256 validAssetAmount = 0;
        for (uint256 i = 0; i < assets.length; i += 1) {
            address assetAddr = assets[i].assetAddr;
            uint256 assetId = assets[i].id;
            uint256 zIndex;
            if (assetAddr != address(0x0)) {
                string memory collectionTitle = IERC1155Asset(assetAddr)
                    .collectionTitle(assetId);
                string memory assetTitle = IERC1155Asset(assetAddr).assetTitle(
                    assetId
                );

                zIndex = IERC1155Asset(assetAddr).zIndex(assetId);

                attributes[wearingAssetAmount] = IERC1155Asset.Attribute(
                    collectionTitle,
                    assetTitle
                );

                queries[validAssetAmount] = ImageHost.Query(
                    uint256(uint160(assetAddr)).toHexString(),
                    assetId.toString()
                );
                layers[validAssetAmount] = QuickSort.Layer(
                    validAssetAmount,
                    zIndex
                );

                wearingAssetAmount += 1;
                validAssetAmount += 1;
            } else {
                if (assetAddr == address(0x0)) {
                    string memory img;
                    (assetAddr, img, zIndex) = IDava(dava()).getDefaultAsset(
                        assets[i].assetType
                    );
                    if (bytes(img).length != 0) {
                        queries[validAssetAmount] = ImageHost.Query(
                            uint256(uint160(assetAddr)).toHexString(),
                            assetId.toString()
                        );
                        layers[validAssetAmount] = QuickSort.Layer(
                            validAssetAmount,
                            zIndex
                        );

                        validAssetAmount += 1;
                    }
                }
            }
        }

        IERC1155Asset.Attribute[]
            memory wearingAttributes = new IERC1155Asset.Attribute[](
                wearingAssetAmount
            );
        for (uint256 i = 0; i < wearingAssetAmount; i += 1) {
            wearingAttributes[i] = attributes[i];
        }

        if (validAssetAmount > 1) {
            QuickSort.sort(layers, int256(0), int256(validAssetAmount - 1));
        }
        ImageHost.Query[] memory sortedQueries = new ImageHost.Query[](
            validAssetAmount
        );
        for (uint256 i = 0; i < validAssetAmount; i += 1) {
            sortedQueries[i] = queries[layers[i].value];
        }

        string memory imgServerHost = IImageHost(dava()).imgServerHost();
        string memory imgUri = ImageHost.getFullUri(
            imgServerHost,
            sortedQueries
        );

        return
            OnchainMetadata.toMetadata(
                name(),
                address(0x0),
                "Genesis Avatar",
                _imgURIs(),
                imgUri,
                wearingAttributes
            );
    }

    function _imgURIs() private view returns (string[] memory) {
        Asset[] memory assets = allAssets();
        QuickSort.Layer[] memory layers = new QuickSort.Layer[](assets.length);

        string[] memory imgURIs = new string[](assets.length);
        uint256 validAssets = 0;
        for (uint256 i = 0; i < assets.length; i += 1) {
            address addr;
            string memory img;
            uint256 zIndex;
            if (assets[i].assetAddr == address(0x0)) {
                (addr, img, zIndex) = IDava(dava()).getDefaultAsset(
                    assets[i].assetType
                );
            } else {
                img = IERC1155Asset(assets[i].assetAddr).imageUri(assets[i].id);
                zIndex = IERC1155Asset(assets[i].assetAddr).zIndex(
                    assets[i].id
                );
            }
            if (bytes(img).length != 0) {
                layers[validAssets] = QuickSort.Layer(validAssets, zIndex);
                imgURIs[validAssets] = img;
                validAssets += 1;
            }
        }

        if (validAssets > 1) {
            QuickSort.sort(layers, int256(0), int256(validAssets - 1));
        }

        string[] memory sortedImgURIs = new string[](validAssets);
        for (uint256 i = 0; i < validAssets; i += 1) {
            sortedImgURIs[i] = imgURIs[layers[i].value];
        }

        return sortedImgURIs;
    }
}
