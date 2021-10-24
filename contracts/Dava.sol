//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

import {UpgradeableBeacon} from "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {ERC721Enumerable, ERC721} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {IAsset} from "./interfaces/IAsset.sol";
import {IAvatar} from "./interfaces/IAvatar.sol";
import {IDava} from "./interfaces/IDava.sol";

contract Dava is ERC721Enumerable, IDava, UpgradeableBeacon {
    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.Bytes32Set;
    using Clones for address;

    mapping(bytes32 => EnumerableSet.AddressSet) private _assets;
    EnumerableSet.Bytes32Set private _supportedAssetTypes;
    address private _masterCopy;

    uint256 public constant MAX_SUPPLY = 10000;

    event AssetRegistered(address asset);
    event AssetDeregistered(address asset);

    // DAO contract owns this registry
    constructor(address avatarController_)
        ERC721("Dava", "DAVA")
        UpgradeableBeacon(avatarController_)
    {
        _masterCopy = avatarController_;
    }

    function mint(address to, uint256 id) public override onlyOwner {
        require(id < MAX_SUPPLY, "Dava: Invalid id");
        _mint(to, id);
    }

    function registerAsset(address asset) public override onlyOwner {
        require(
            IERC165(asset).supportsInterface(type(IAsset).interfaceId),
            "Does not support IAsset interface"
        );
        bytes32 assetType = IAsset(asset).assetType();
        _assets[assetType].add(asset);
        if (!_supportedAssetTypes.contains(assetType)) {
            _supportedAssetTypes.add(assetType);
        }
    }

    function deregisterAsset(address asset) public override onlyOwner {
        bytes32 assetType = IAsset(asset).assetType();
        require(_assets[assetType].contains(asset), "Dava: Not registered");
        _assets[assetType].remove(asset);

        if (_assets[assetType].length() == 0) {
            _supportedAssetTypes.remove(assetType);
        }
    }

    function isDavaAsset(address asset) public view override returns (bool) {
        bytes32 assetType = IAsset(asset).assetType();
        return _assets[assetType].contains(asset);
    }

    function getAvatar(uint256 tokenId) public view override returns (address) {
        return
            _masterCopy.predictDeterministicAddress(
                bytes32(tokenId),
                address(this)
            );
    }

    function getAllAssets(bytes32 assetType)
        public
        view
        override
        returns (address[] memory)
    {
        return _assets[assetType].values();
    }

    function getAllSupportedAssetTypes()
        public
        view
        override
        returns (bytes32[] memory)
    {
        return _supportedAssetTypes.values();
    }

    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        override
        returns (string memory)
    {
        require(
            _exists(tokenId),
            "ERC721Metadata: URI query for nonexistent token"
        );
        return IAvatar(getAvatar(tokenId)).getPFP();
    }

    function _mint(address to, uint256 id) internal override {
        address avatar = _masterCopy.cloneDeterministic(bytes32(id));
        IAvatar(avatar).initialize(id);
        super._mint(to, id);
    }
}
