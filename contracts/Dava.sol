//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC721Enumerable, ERC721} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {UpgradeableBeacon} from "./libraries/UpgradeableBeacon.sol";
import {MinimalProxy} from "./libraries/MinimalProxy.sol";
import {IAvatar} from "./interfaces/IAvatar.sol";
import {IAsset} from "./interfaces/IAsset.sol";
import {IDava} from "./interfaces/IDava.sol";

contract Dava is AccessControl, ERC721Enumerable, IDava, UpgradeableBeacon {
    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.Bytes32Set;
    using Clones for address;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant ASSET_MANAGER_ROLE =
        keccak256("ASSET_MANAGER_ROLE");
    bytes32 public constant UPGRADE_MANAGER_ROLE =
        keccak256("UPGRADE_MANAGER_ROLE");

    mapping(bytes32 => EnumerableSet.AddressSet) private _assets;
    mapping(bytes32 => IAsset) private _defaultAssets;

    EnumerableSet.Bytes32Set private _supportedAssetTypes;
    address private _minimalProxy;

    uint256 public constant MAX_SUPPLY = 10000;

    event AssetRegistered(address asset);
    event AssetDeregistered(address asset);

    // DAO contract owns this registry
    constructor(address minimalProxy_)
        ERC721("Dava", "DAVA")
        UpgradeableBeacon(minimalProxy_)
    {
        _minimalProxy = minimalProxy_;

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MINTER_ROLE, msg.sender);
        _setRoleAdmin(MINTER_ROLE, DEFAULT_ADMIN_ROLE);
        _setupRole(ASSET_MANAGER_ROLE, msg.sender);
        _setRoleAdmin(ASSET_MANAGER_ROLE, DEFAULT_ADMIN_ROLE);
        _setupRole(UPGRADE_MANAGER_ROLE, msg.sender);
        _setRoleAdmin(UPGRADE_MANAGER_ROLE, DEFAULT_ADMIN_ROLE);
    }

    function upgradeTo(address newImplementation)
        public
        onlyRole(UPGRADE_MANAGER_ROLE)
    {
        _upgradeTo(newImplementation);
    }

    function mint(address to, uint256 id)
        public
        override
        onlyRole(MINTER_ROLE)
    {
        require(id < MAX_SUPPLY, "Dava: Invalid id");
        _mint(to, id);
    }

    function registerAsset(address asset)
        public
        override
        onlyRole(ASSET_MANAGER_ROLE)
    {
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

    function registerDefaultAsset(address asset)
        public
        override
        onlyRole(ASSET_MANAGER_ROLE)
    {
        require(
            IERC165(asset).supportsInterface(type(IAsset).interfaceId),
            "Does not support IAsset interface"
        );
        bytes32 assetType = IAsset(asset).assetType();
        _defaultAssets[assetType] = IAsset(asset);
        if (!_supportedAssetTypes.contains(assetType)) {
            _supportedAssetTypes.add(assetType);
        }
    }

    function deregisterAsset(address asset)
        public
        override
        onlyRole(ASSET_MANAGER_ROLE)
    {
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
            _minimalProxy.predictDeterministicAddress(
                bytes32(tokenId),
                address(this)
            );
    }

    function getDefaultAsset(bytes32 assetType)
        public
        view
        override
        returns (string memory image, uint256 zIndex)
    {
        IAsset defaultAsset = _defaultAssets[assetType];
        if (address(defaultAsset) == address(0)) return ("", 0);
        else {
            image = defaultAsset.defaultImage();
            zIndex = defaultAsset.zIndex();
        }
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
        return IAvatar(getAvatar(tokenId)).getMetadata();
    }

    function getPFP(uint256 tokenId)
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

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(AccessControl, ERC721Enumerable, IERC165)
        returns (bool)
    {
        return
            AccessControl.supportsInterface(interfaceId) ||
            ERC721Enumerable.supportsInterface(interfaceId) ||
            super.supportsInterface(interfaceId) ||
            interfaceId == type(IDava).interfaceId;
    }

    function _mint(address to, uint256 id) internal override {
        address avatar = _minimalProxy.cloneDeterministic(bytes32(id));
        MinimalProxy(payable(avatar)).initialize(id);
        super._mint(to, id);
    }
}
