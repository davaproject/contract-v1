//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC721Enumerable, ERC721} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {UpgradeableBeacon} from "./libraries/UpgradeableBeacon.sol";
import {MinimalProxy} from "./libraries/MinimalProxy.sol";
import {Asset, IAvatar} from "./interfaces/IAvatar.sol";
import {ICollection} from "./interfaces/ICollection.sol";
import {IDava} from "./interfaces/IDava.sol";

contract Dava is
    AccessControl,
    ERC721Enumerable,
    Ownable,
    IDava,
    UpgradeableBeacon
{
    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.Bytes32Set;
    using Clones for address;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant ASSET_MANAGER_ROLE =
        keccak256("ASSET_MANAGER_ROLE");
    bytes32 public constant UPGRADE_MANAGER_ROLE =
        keccak256("UPGRADE_MANAGER_ROLE");

    string public override imgServerHost;

    // collection => assetTypes[]
    mapping(ICollection => EnumerableSet.Bytes32Set)
        private _assetTypesOfCollection;
    // asset types => collection
    mapping(bytes32 => EnumerableSet.AddressSet) private _collectionOfAsset;
    // collection types => collection
    mapping(bytes32 => ICollection) private _defaultCollections;

    EnumerableSet.AddressSet private _registeredCollections;
    EnumerableSet.Bytes32Set private _supportedDefaultCollectionTypes;
    EnumerableSet.Bytes32Set private _supportedAssetTypes;
    address private _minimalProxy;

    uint256 public constant MAX_SUPPLY = 10000;

    event CollectionRegistered(address collection);
    event CollectionDeregistered(address collection);
    event DefaultCollectionRegistered(address collection);
    event DefaultCollectionDeregistered(address collection);
    event AssetRegistered(bytes32 assetType, address collection);
    event AssetDeregistered(bytes32 assetType, address collection);

    // DAO contract owns this registry
    constructor(address minimalProxy_, string memory imgServerHost_)
        ERC721("Dava", "DAVA")
        UpgradeableBeacon(minimalProxy_)
        Ownable()
    {
        _minimalProxy = minimalProxy_;
        imgServerHost = imgServerHost_;

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MINTER_ROLE, msg.sender);
        _setRoleAdmin(MINTER_ROLE, DEFAULT_ADMIN_ROLE);
        _setupRole(ASSET_MANAGER_ROLE, msg.sender);
        _setRoleAdmin(ASSET_MANAGER_ROLE, DEFAULT_ADMIN_ROLE);
        _setupRole(UPGRADE_MANAGER_ROLE, msg.sender);
        _setRoleAdmin(UPGRADE_MANAGER_ROLE, DEFAULT_ADMIN_ROLE);
    }

    function setHost(string memory imgServerHost_)
        external
        onlyRole(UPGRADE_MANAGER_ROLE)
    {
        imgServerHost = imgServerHost_;
    }

    function upgradeTo(address newImplementation)
        external
        onlyRole(UPGRADE_MANAGER_ROLE)
    {
        _upgradeTo(newImplementation);
    }

    function mint(address to, uint256 id)
        external
        override
        onlyRole(MINTER_ROLE)
    {
        require(id < MAX_SUPPLY, "Dava: Invalid id");
        _mint(to, id);
    }

    function registerCollection(address collection)
        external
        override
        onlyRole(ASSET_MANAGER_ROLE)
    {
        require(
            IERC165(collection).supportsInterface(
                type(ICollection).interfaceId
            ),
            "Dava: Does not support ICollection interface"
        );
        require(
            !_registeredCollections.contains(collection),
            "Dava: already registered collection"
        );
        _registeredCollections.add(collection);

        emit CollectionRegistered(collection);
    }

    function registerAssetType(address collection, bytes32 assetType)
        external
        override
        onlyRole(ASSET_MANAGER_ROLE)
    {
        require(
            _registeredCollections.contains(collection),
            "Dava: collection is not registered"
        );

        require(
            !_supportedAssetTypes.contains(assetType),
            "Dava: assetType is already registered"
        );
        _assetTypesOfCollection[ICollection(collection)].add(assetType);
        _collectionOfAsset[assetType].add(collection);
        _supportedAssetTypes.add(assetType);

        emit AssetRegistered(assetType, collection);
    }

    function registerDefaultCollection(address collection)
        external
        override
        onlyRole(ASSET_MANAGER_ROLE)
    {
        require(
            IERC165(collection).supportsInterface(
                type(ICollection).interfaceId
            ),
            "Dava: Does not support ICollection interface"
        );

        bytes32 collectionType = ICollection(collection).collectionType();
        require(
            !_supportedDefaultCollectionTypes.contains(collectionType),
            "Dava: already registered default collection"
        );
        require(
            !_registeredCollections.contains(collection),
            "Dava: collection is registered as normal collection"
        );

        _defaultCollections[collectionType] = ICollection(collection);
        _registeredCollections.add(collection);
        _supportedDefaultCollectionTypes.add(collectionType);

        emit DefaultCollectionRegistered(collection);
    }

    function deregisterCollection(address collection)
        external
        override
        onlyRole(ASSET_MANAGER_ROLE)
    {
        require(
            _registeredCollections.contains(collection),
            "Dava: Not registered collection"
        );

        EnumerableSet.Bytes32Set storage assetTypes = _assetTypesOfCollection[
            ICollection(collection)
        ];
        for (uint256 i = 0; i < assetTypes.length(); i += 1) {
            _supportedAssetTypes.remove(assetTypes.at(i));
            _collectionOfAsset[assetTypes.at(i)].remove(collection);
        }

        _registeredCollections.remove(collection);

        emit CollectionDeregistered(collection);
    }

    function deregisterAssetType(bytes32 assetType)
        external
        override
        onlyRole(ASSET_MANAGER_ROLE)
    {
        require(
            _supportedAssetTypes.contains(assetType),
            "Dava: non registered assetType"
        );
        _supportedAssetTypes.remove(assetType);

        EnumerableSet.AddressSet storage collections = _collectionOfAsset[
            assetType
        ];
        for (uint256 i = 0; i < collections.length(); i += 1) {
            address collection = collections.at(i);
            _assetTypesOfCollection[ICollection(collection)].remove(assetType);
            emit AssetDeregistered(assetType, collection);
        }

        delete _collectionOfAsset[assetType];
    }

    function deregisterDefaultCollection(address collection)
        external
        override
        onlyRole(ASSET_MANAGER_ROLE)
    {
        bytes32 collectionType = ICollection(collection).collectionType();
        require(
            _supportedDefaultCollectionTypes.contains(collectionType),
            "Dava: Not registered"
        );

        _supportedDefaultCollectionTypes.remove(collectionType);
        _registeredCollections.remove(collection);

        emit DefaultCollectionDeregistered(collection);
    }

    function zap(uint256 tokenId, ZapReq calldata zapReq) public override {
        require(
            msg.sender == getAvatar(tokenId),
            "Dava: avatar and tokenId does not match"
        );

        address owner = ownerOf(tokenId);
        IERC1155 collection = IERC1155(zapReq.collection);
        require(
            collection.supportsInterface(type(IERC1155).interfaceId),
            "Dava: asset is not transferable"
        );
        require(
            collection.balanceOf(owner, zapReq.assetId) >= zapReq.amount,
            "Dava: owner does not hold asset"
        );
        collection.safeTransferFrom(
            owner,
            msg.sender,
            zapReq.assetId,
            zapReq.amount,
            ""
        );
    }

    function zap(uint256 tokenId, ZapReq[] calldata zapReqs) external override {
        for (uint256 i = 0; i < zapReqs.length; i += 1) {
            zap(tokenId, zapReqs[i]);
        }
    }

    function isRegisteredCollection(address collection)
        external
        view
        override
        returns (bool)
    {
        return _registeredCollections.contains(collection);
    }

    function isDefaultCollection(address collection_)
        external
        view
        override
        returns (bool)
    {
        return
            _registeredCollections.contains(collection_) &&
            _supportedDefaultCollectionTypes.contains(
                ICollection(collection_).collectionType()
            );
    }

    function isDavaAsset(address collection, bytes32 assetType)
        external
        view
        override
        returns (bool)
    {
        return _collectionOfAsset[assetType].contains(collection);
    }

    function getAvatar(uint256 tokenId) public view override returns (address) {
        return
            _minimalProxy.predictDeterministicAddress(
                bytes32(tokenId),
                address(this)
            );
    }

    function getDefaultAsset(bytes32 collectionType)
        external
        view
        override
        returns (
            address asset,
            string memory image,
            uint256 zIndex
        )
    {
        if (address(_defaultCollections[collectionType]) == address(0))
            return (address(0), "", 0);
        else {
            asset = address(_defaultCollections[collectionType]);
            image = _defaultCollections[collectionType].defaultImage();
            zIndex = _defaultCollections[collectionType].zIndex();
        }
    }

    function getAllSupportedAssetTypes()
        external
        view
        override
        returns (bytes32[] memory assetTypes)
    {
        return _supportedAssetTypes.values();
    }

    function getAllSupportedDefaultCollectionTypes()
        external
        view
        override
        returns (bytes32[] memory collectionTypes)
    {
        return _supportedDefaultCollectionTypes.values();
    }

    function getAssetTypes(address collection)
        external
        view
        override
        returns (bytes32[] memory assetTypes)
    {
        return _assetTypesOfCollection[ICollection(collection)].values();
    }

    function getCollections(bytes32 assetType)
        external
        view
        override
        returns (address[] memory collections)
    {
        return _collectionOfAsset[assetType].values();
    }

    function getRegisteredCollections()
        external
        view
        override
        returns (address[] memory)
    {
        return _registeredCollections.values();
    }

    function tokenURI(uint256 tokenId)
        public
        view
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
        external
        view
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
        override(AccessControl, ERC721Enumerable, IERC165)
        returns (bool)
    {
        return
            interfaceId == type(IDava).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function _mint(address to, uint256 id) internal override {
        address avatar = _minimalProxy.cloneDeterministic(bytes32(id));
        MinimalProxy(payable(avatar)).initialize(id);
        super._mint(to, id);
    }
}
