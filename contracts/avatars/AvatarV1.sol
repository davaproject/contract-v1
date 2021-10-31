//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {IERC1155Collection} from "../interfaces/IERC1155Collection.sol";
import {ImageHost} from "../libraries/ImageHost.sol";
import {IImageHost} from "../interfaces/IImageHost.sol";
import {ITransferableCollection} from "../interfaces/ICollection.sol";
import {AvatarBase} from "../libraries/AvatarBase.sol";
import {Asset} from "../interfaces/IAvatar.sol";
import {IDava} from "../interfaces/IDava.sol";
import {OnchainMetadata} from "../libraries/OnchainMetadata.sol";
import {QuickSort} from "../libraries/QuickSort.sol";

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
                    ITransferableCollection(equippedAsset.assetAddr)
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

        IERC1155Collection.Attribute[]
            memory attributes = new IERC1155Collection.Attribute[](
                assets.length
            );

        QuickSort.Layer[] memory layers = new QuickSort.Layer[](assets.length);

        ImageHost.Query[] memory queries = new ImageHost.Query[](assets.length);

        IDava _dava = IDava(dava());
        uint256 wearingAssetAmount = 0;
        uint256 validAssetAmount = 0;
        for (uint256 i = 0; i < assets.length; i += 1) {
            bool isValid = false;
            address assetAddr = assets[i].assetAddr;
            uint256 assetId = assets[i].id;
            uint256 zIndex;

            if (assetAddr != address(0x0)) {
                if (_dava.isDefaultCollection(assetAddr)) {
                    (, , zIndex) = _dava.getDefaultAsset(assets[i].assetType);
                    isValid = true;
                } else {
                    string memory collectionTitle = IERC1155Collection(
                        assetAddr
                    ).collectionTitle(assetId);
                    string memory assetTitle = IERC1155Collection(assetAddr)
                        .assetTitle(assetId);
                    zIndex = IERC1155Collection(assetAddr).zIndex(assetId);

                    attributes[wearingAssetAmount] = IERC1155Collection
                        .Attribute(collectionTitle, assetTitle);

                    wearingAssetAmount += 1;
                    isValid = true;
                }
            }

            if (isValid) {
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

        IERC1155Collection.Attribute[]
            memory wearingAttributes = new IERC1155Collection.Attribute[](
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

        IDava _dava = IDava(dava());
        string[] memory imgURIs = new string[](assets.length);
        uint256 validAssets = 0;
        for (uint256 i = 0; i < assets.length; i += 1) {
            address addr = assets[i].assetAddr;
            string memory img;
            uint256 zIndex;

            if (addr != address(0x0)) {
                if (_dava.isDefaultCollection(addr)) {
                    (, img, zIndex) = _dava.getDefaultAsset(
                        assets[i].assetType
                    );
                } else {
                    img = IERC1155Collection(addr).imageUri(assets[i].id);
                    zIndex = IERC1155Collection(addr).zIndex(assets[i].id);
                }
                if (bytes(img).length != 0) {
                    layers[validAssets] = QuickSort.Layer(validAssets, zIndex);
                    imgURIs[validAssets] = img;
                    validAssets += 1;
                }
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
