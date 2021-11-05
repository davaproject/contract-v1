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
import {Part, IAvatar} from "./interfaces/IAvatar.sol";
import {IFrameCollection} from "./interfaces/IFrameCollection.sol";
import {IPartCollection} from "./interfaces/IPartCollection.sol";
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
    bytes32 public constant PART_MANAGER_ROLE = keccak256("PART_MANAGER_ROLE");
    bytes32 public constant UPGRADE_MANAGER_ROLE =
        keccak256("UPGRADE_MANAGER_ROLE");

    string public override baseURI;
    address public override frameCollection;

    EnumerableSet.AddressSet private _registeredCollections;
    EnumerableSet.Bytes32Set private _supportedPartTypes;
    address private _minimalProxy;

    uint256 public constant MAX_SUPPLY = 10000;

    event CollectionRegistered(address collection);
    event CollectionDeregistered(address collection);
    event DefaultCollectionRegistered(address collection);
    event PartTypeRegistered(bytes32 partType);
    event PartTypeDeregistered(bytes32 partType);

    // DAO contract owns this registry
    constructor(address minimalProxy_, string memory baseURI_)
        ERC721("Dava", "DAVA")
        UpgradeableBeacon(minimalProxy_)
        Ownable()
    {
        _minimalProxy = minimalProxy_;
        baseURI = baseURI_;

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MINTER_ROLE, msg.sender);
        _setRoleAdmin(MINTER_ROLE, DEFAULT_ADMIN_ROLE);
        _setupRole(PART_MANAGER_ROLE, msg.sender);
        _setRoleAdmin(PART_MANAGER_ROLE, DEFAULT_ADMIN_ROLE);
        _setupRole(UPGRADE_MANAGER_ROLE, msg.sender);
        _setRoleAdmin(UPGRADE_MANAGER_ROLE, DEFAULT_ADMIN_ROLE);
    }

    function setBaseURI(string memory baseURI_)
        external
        onlyRole(UPGRADE_MANAGER_ROLE)
    {
        baseURI = baseURI_;
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
        onlyRole(PART_MANAGER_ROLE)
    {
        require(
            IERC165(collection).supportsInterface(
                type(IPartCollection).interfaceId
            ),
            "Dava: Does not support IPartCollection interface"
        );
        require(
            !_registeredCollections.contains(collection),
            "Dava: already registered collection"
        );
        _registeredCollections.add(collection);

        emit CollectionRegistered(collection);
    }

    function registerPartType(bytes32 partType)
        external
        override
        onlyRole(PART_MANAGER_ROLE)
    {
        require(
            !_supportedPartTypes.contains(partType),
            "Dava: partType is already registered"
        );
        _supportedPartTypes.add(partType);

        emit PartTypeRegistered(partType);
    }

    function registerFrameCollection(address collection)
        external
        override
        onlyRole(PART_MANAGER_ROLE)
    {
        require(
            IERC165(collection).supportsInterface(
                type(IFrameCollection).interfaceId
            ),
            "Dava: Does not support IFrameCollection interface"
        );

        frameCollection = collection;

        emit DefaultCollectionRegistered(collection);
    }

    function deregisterCollection(address collection)
        external
        override
        onlyRole(PART_MANAGER_ROLE)
    {
        require(
            _registeredCollections.contains(collection),
            "Dava: Not registered collection"
        );

        _registeredCollections.remove(collection);

        emit CollectionDeregistered(collection);
    }

    function deregisterPartType(bytes32 partType)
        external
        override
        onlyRole(PART_MANAGER_ROLE)
    {
        require(
            _supportedPartTypes.contains(partType),
            "Dava: non registered partType"
        );
        _supportedPartTypes.remove(partType);

        emit PartTypeDeregistered(partType);
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
            "Dava: part is not transferable"
        );
        require(
            collection.balanceOf(owner, zapReq.partId) >= zapReq.amount,
            "Dava: owner does not hold part"
        );
        collection.safeTransferFrom(
            owner,
            msg.sender,
            zapReq.partId,
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

    function isSupportedPartType(bytes32 partType)
        external
        view
        override
        returns (bool)
    {
        return _supportedPartTypes.contains(partType);
    }

    function isDavaPart(address collection, bytes32 partType)
        external
        view
        override
        returns (bool)
    {
        return
            _registeredCollections.contains(collection) &&
            _supportedPartTypes.contains(partType);
    }

    function getAvatar(uint256 tokenId) public view override returns (address) {
        return
            _minimalProxy.predictDeterministicAddress(
                bytes32(tokenId),
                address(this)
            );
    }

    function getAllSupportedPartTypes()
        external
        view
        override
        returns (bytes32[] memory partTypes)
    {
        return _supportedPartTypes.values();
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
