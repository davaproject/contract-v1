//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {IAssetCollection} from "../interfaces/IAssetCollection.sol";
import {URICompiler} from "../libraries/URICompiler.sol";
import {IHost} from "../interfaces/IHost.sol";
import {IFrameCollection} from "../interfaces/IFrameCollection.sol";
import {AvatarBase} from "../libraries/AvatarBase.sol";
import {Asset} from "../interfaces/IAvatar.sol";
import {IDava} from "../interfaces/IDava.sol";
import {OnchainMetadata} from "../libraries/OnchainMetadata.sol";
import {QuickSort} from "../libraries/QuickSort.sol";

contract AvatarV1 is AvatarBase {
    using Strings for uint256;

    function dress(Asset[] calldata assetsOn, bytes32[] calldata assetsOff)
        external
        override
        onlyOwner
    {
        IDava.ZapReq[] memory zapReqs = new IDava.ZapReq[](assetsOn.length);
        uint256 zapAmount = 0;
        for (uint256 i = 0; i < assetsOn.length; i += 1) {
            if (!_isEligible(assetsOn[i])) {
                zapReqs[zapAmount] = IDava.ZapReq(
                    assetsOn[i].assetAddr,
                    assetsOn[i].id,
                    1
                );
                zapAmount += 1;
            }
        }
        IDava.ZapReq[] memory validZapReqs = new IDava.ZapReq[](zapAmount);
        for (uint256 i = 0; i < zapAmount; i += 1) {
            validZapReqs[i] = zapReqs[i];
        }
        IDava(dava()).zap(_props().davaId, validZapReqs);

        for (uint256 i = 0; i < assetsOn.length; i += 1) {
            _putOn(Asset(assetsOn[i].assetAddr, assetsOn[i].id));
        }

        for (uint256 i = 0; i < assetsOff.length; i += 1) {
            Asset memory equippedAsset = asset(assetsOff[i]);
            if (equippedAsset.assetAddr != address(0x0)) {
                _takeOff(assetsOff[i]);
                IAssetCollection(equippedAsset.assetAddr).safeTransferFrom(
                    address(this),
                    msg.sender,
                    equippedAsset.id,
                    1,
                    ""
                );
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
        IDava _dava = IDava(dava());

        Asset[] memory assets = allAssets();
        address frameCollection = _dava.frameCollection();
        IFrameCollection.Frame[] memory frames = IFrameCollection(
            frameCollection
        ).getAllFrames();

        QuickSort.Layer[] memory layers = new QuickSort.Layer[](
            assets.length + frames.length
        );

        IAssetCollection.Attribute[]
            memory attributes = new IAssetCollection.Attribute[](assets.length);
        URICompiler.Query[] memory queries = new URICompiler.Query[](
            assets.length + frames.length
        );

        for (uint256 i = 0; i < frames.length; i += 1) {
            queries[i] = URICompiler.Query(
                uint256(uint160(frameCollection)).toHexString(),
                frames[i].id.toString()
            );
            layers[i] = QuickSort.Layer(i, frames[i].zIndex);
        }

        uint256 wearingAssetAmount = 0;
        uint256 layerAmount = frames.length;
        for (uint256 i = 0; i < assets.length; i += 1) {
            if (assets[i].assetAddr != address(0x0)) {
                attributes[wearingAssetAmount] = IAssetCollection.Attribute(
                    IAssetCollection(assets[i].assetAddr).assetTypeTitle(
                        assets[i].id
                    ),
                    IAssetCollection(assets[i].assetAddr).assetTitle(
                        assets[i].id
                    )
                );

                queries[layerAmount] = URICompiler.Query(
                    uint256(uint160(assets[i].assetAddr)).toHexString(),
                    assets[i].id.toString()
                );
                layers[layerAmount] = QuickSort.Layer(
                    layerAmount,
                    IAssetCollection(assets[i].assetAddr).zIndex(assets[i].id)
                );
                layerAmount += 1;
                wearingAssetAmount += 1;
            }
        }

        if (layerAmount > 1) {
            QuickSort.sort(layers, int256(0), int256(layerAmount - 1));
        }
        URICompiler.Query[] memory sortedQueries = new URICompiler.Query[](
            layerAmount
        );
        for (uint256 i = 0; i < layerAmount; i += 1) {
            sortedQueries[i] = queries[layers[i].value];
        }

        string memory baseURI = IHost(dava()).baseURI();
        string[] memory imgParams = new string[](1);
        imgParams[0] = "images";

        IAssetCollection.Attribute[]
            memory wearingAttributes = new IAssetCollection.Attribute[](
                wearingAssetAmount + 2
            );
        for (uint256 i = 0; i < wearingAssetAmount; i += 1) {
            wearingAttributes[i] = attributes[i];
        }
        wearingAttributes[wearingAssetAmount] = IAssetCollection.Attribute(
            "Avatar",
            uint256(uint160(address(this))).toHexString()
        );

        string[] memory infoParams = new string[](2);
        infoParams[0] = "infos";
        infoParams[1] = _props().davaId.toString();
        wearingAttributes[wearingAssetAmount + 1] = IAssetCollection.Attribute(
            "Info",
            URICompiler.getFullUri(
                baseURI,
                infoParams,
                new URICompiler.Query[](0)
            )
        );

        return
            OnchainMetadata.toMetadata(
                name(),
                address(0x0),
                string(
                    abi.encodePacked(
                        "Genesis Avatar (",
                        uint256(uint160(address(this))).toHexString(),
                        ")"
                    )
                ),
                _imgURIs(),
                URICompiler.getFullUri(baseURI, imgParams, sortedQueries),
                wearingAttributes
            );
    }

    function _imgURIs() private view returns (string[] memory) {
        IDava _dava = IDava(dava());

        Asset[] memory assets = allAssets();
        address frameCollection = _dava.frameCollection();
        IFrameCollection.Frame[] memory frames = IFrameCollection(
            frameCollection
        ).getAllFrames();

        uint256 totalLayers = frames.length + assets.length;
        uint256 validLayers = frames.length;

        QuickSort.Layer[] memory layers = new QuickSort.Layer[](totalLayers);
        string[] memory imgURIs = new string[](totalLayers);
        for (uint256 i = 0; i < frames.length; i += 1) {
            imgURIs[i] = frames[i].imgUri;
            layers[i] = QuickSort.Layer(i, frames[i].zIndex);
        }

        for (uint256 i = 0; i < assets.length; i += 1) {
            if (assets[i].assetAddr != address(0x0)) {
                imgURIs[validLayers] = IAssetCollection(assets[i].assetAddr)
                    .imageUri(assets[i].id);
                layers[validLayers] = QuickSort.Layer(
                    validLayers,
                    IAssetCollection(assets[i].assetAddr).zIndex(assets[i].id)
                );
                validLayers += 1;
            }
        }

        if (validLayers > 1) {
            QuickSort.sort(layers, int256(0), int256(validLayers - 1));
        }

        string[] memory sortedImgURIs = new string[](validLayers);
        for (uint256 i = 0; i < validLayers; i += 1) {
            sortedImgURIs[i] = imgURIs[layers[i].value];
        }

        return sortedImgURIs;
    }
}
