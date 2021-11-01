//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

import {ERC1155Supply, ERC1155, IERC1155} from "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {IERC165} from "@openzeppelin/contracts/interfaces/IERC165.sol";
import {IERC1155Collection} from "../interfaces/IERC1155Collection.sol";
import {ICollection} from "../interfaces/ICollection.sol";
import {IAvatar} from "../interfaces/IAvatar.sol";
import {OnchainMetadata} from "./OnchainMetadata.sol";
import {ImageHost} from "./ImageHost.sol";

struct AssetInfo {
    mapping(uint256 => string) titles;
    mapping(uint256 => address) creators;
    mapping(uint256 => string) descriptions;
    mapping(uint256 => string) imgURIs;
    mapping(uint256 => uint256) maxSupply;
    mapping(uint256 => IERC1155Collection.Attribute[]) attributes;
    mapping(uint256 => bytes32) assetTypes;
}

struct CollectionInfo {
    // collection type => zIndex
    mapping(bytes32 => uint256) zIndex;
    // collection type => name
    mapping(bytes32 => string) name;
    // collection type => current contract tokenId
    mapping(bytes32 => uint256) backgroundImageAsset;
    // collection type => current contract tokenId
    mapping(bytes32 => uint256) foregroundImageAsset;
    // zIndex => bool
    mapping(uint256 => bool) zIndexExists;
}

abstract contract ERC1155Collection is
    AccessControl,
    Ownable,
    ERC1155Supply,
    IERC1155Collection
{
    using Strings for uint256;
    using Address for address;
    using EnumerableSet for EnumerableSet.Bytes32Set;

    bytes32 public constant DEFAULT_ASSET_TYPE = keccak256("DEFAULT_ASSET");

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant CREATOR_ROLE = keccak256("CREATOR_ROLE");

    address public dava;

    string public imgServerHost;

    AssetInfo private _assetInfo;
    CollectionInfo private _collectionInfo;
    uint256 public override numberOfAssets;

    uint256 public maxTotalAssetSupply = 0;
    uint256 public totalAssetSupply = 0;

    EnumerableSet.Bytes32Set private _supportedAssetTypes;

    constructor(string memory imgServerHost_, address dava_)
        ERC1155("")
        Ownable()
    {
        imgServerHost = imgServerHost_;
        dava = dava_;

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MINTER_ROLE, msg.sender);
        _setRoleAdmin(MINTER_ROLE, DEFAULT_ADMIN_ROLE);
        _setupRole(CREATOR_ROLE, msg.sender);
        _setRoleAdmin(CREATOR_ROLE, DEFAULT_ADMIN_ROLE);

        _supportedAssetTypes.add(DEFAULT_ASSET_TYPE);
    }

    function setHost(string memory imgServerHost_) external onlyOwner {
        imgServerHost = imgServerHost_;
    }

    function createAsset(
        bytes32 assetType_,
        string memory title_,
        address creator_,
        string memory description_,
        string memory uri_,
        Attribute[] memory attributes,
        uint256 maxSupply_
    ) public virtual override onlyRole(CREATOR_ROLE) {
        uint256 tokenId = numberOfAssets;
        _assetInfo.titles[tokenId] = title_;
        _assetInfo.creators[tokenId] = creator_;
        _assetInfo.descriptions[tokenId] = description_;
        _assetInfo.imgURIs[tokenId] = uri_;
        _assetInfo.maxSupply[tokenId] = maxSupply_;

        // default asset
        require(
            _supportedAssetTypes.contains(assetType_),
            "ERC1155Asset: non existent collection"
        );
        if (assetType_ == DEFAULT_ASSET_TYPE) {
            require(
                maxSupply_ == 0,
                "ERC1155Asset: maxSupply of default asset should be zero"
            );
        } else {
            require(
                maxSupply_ != 0,
                "ERC1155Asset: maxSupply should be greater than zero"
            );
        }
        _assetInfo.assetTypes[tokenId] = assetType_;

        for (uint256 i = 0; i < attributes.length; i += 1) {
            _assetInfo.attributes[tokenId].push(attributes[i]);
        }

        numberOfAssets += 1;
        maxTotalAssetSupply += maxSupply_;
    }

    function createCollection(
        string memory name_,
        uint256 backgroundImageTokenId_,
        uint256 foregroundImageTokenId_,
        uint256 zIndex_
    ) public virtual override onlyRole(CREATOR_ROLE) {
        bytes32 _assetType = keccak256(abi.encodePacked(name_));
        require(
            !_supportedAssetTypes.contains(_assetType),
            "ERC1155Asset: already exists collection"
        );
        require(
            !_collectionInfo.zIndexExists[zIndex_],
            "ERC1155Asset: already used zIndex"
        );

        require(
            _assetInfo.assetTypes[backgroundImageTokenId_] ==
                DEFAULT_ASSET_TYPE &&
                _assetInfo.assetTypes[foregroundImageTokenId_] ==
                DEFAULT_ASSET_TYPE,
            "ERC1155Asset: background image is not created"
        );

        _collectionInfo.zIndex[_assetType] = zIndex_;
        _collectionInfo.name[_assetType] = name_;
        _collectionInfo.backgroundImageAsset[
            _assetType
        ] = backgroundImageTokenId_;
        _collectionInfo.foregroundImageAsset[
            _assetType
        ] = foregroundImageTokenId_;
        _collectionInfo.zIndexExists[zIndex_] = true;

        _supportedAssetTypes.add(_assetType);
    }

    function mint(
        address account,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public onlyRole(MINTER_ROLE) {
        require(totalSupply(id) + amount <= maxSupply(id), "Out of stock.");

        totalAssetSupply += amount;
        return super._mint(account, id, amount, data);
    }

    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public onlyRole(MINTER_ROLE) {
        for (uint256 i = 0; i < ids.length; i += 1) {
            uint256 id = ids[i];
            uint256 amount = amounts[i];
            require(totalSupply(id) + amount <= maxSupply(id), "Out of stock.");

            totalAssetSupply += amount;
        }
        return super._mintBatch(to, ids, amounts, data);
    }

    // viewers

    function uri(uint256 tokenId) public view override returns (string memory) {
        require(exists(tokenId), "non existent token");

        string[] memory imgURIs = new string[](3);
        uint256 backgroundTokenId = _collectionInfo.backgroundImageAsset[
            _assetInfo.assetTypes[tokenId]
        ];
        uint256 foregroundTokenId = _collectionInfo.foregroundImageAsset[
            _assetInfo.assetTypes[tokenId]
        ];

        imgURIs[0] = _assetInfo.imgURIs[backgroundTokenId];
        imgURIs[1] = _assetInfo.imgURIs[tokenId];
        imgURIs[2] = _assetInfo.imgURIs[foregroundTokenId];

        string[] memory params = new string[](1);
        params[0] = "images";
        ImageHost.Query[] memory queries = new ImageHost.Query[](3);
        string memory thisAddress = uint256(uint160(address(this)))
            .toHexString();
        queries[0] = ImageHost.Query(thisAddress, backgroundTokenId.toString());
        queries[1] = ImageHost.Query(thisAddress, tokenId.toString());
        queries[2] = ImageHost.Query(thisAddress, foregroundTokenId.toString());

        return
            OnchainMetadata.toMetadata(
                _assetInfo.titles[tokenId],
                _assetInfo.creators[tokenId],
                _assetInfo.descriptions[tokenId],
                imgURIs,
                ImageHost.getFullUri(imgServerHost, params, queries),
                _assetInfo.attributes[tokenId]
            );
    }

    function imageUri(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        return _assetInfo.imgURIs[tokenId];
    }

    function image(uint256 tokenId)
        external
        view
        override
        returns (string memory)
    {
        string[] memory imgURIs = new string[](1);
        imgURIs[0] = _assetInfo.imgURIs[tokenId];
        return OnchainMetadata.compileImages(imgURIs);
    }

    function getAllSupportedAssetTypes()
        public
        view
        returns (bytes32[] memory)
    {
        return _supportedAssetTypes.values();
    }

    function creator(uint256 tokenId)
        public
        view
        virtual
        override
        returns (address)
    {
        return _assetInfo.creators[tokenId];
    }

    function maxSupply(uint256 tokenId)
        public
        view
        virtual
        override
        returns (uint256)
    {
        return _assetInfo.maxSupply[tokenId];
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC1155, AccessControl, IERC165)
        returns (bool)
    {
        return
            interfaceId == type(IERC1155Collection).interfaceId ||
            interfaceId == type(ICollection).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function collectionTitle(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        bytes32 _assetType = _assetInfo.assetTypes[tokenId];
        return _collectionInfo.name[_assetType];
    }

    /**
     * @dev return registered asset title
     */
    function assetTitle(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        return _assetInfo.titles[tokenId];
    }

    function assetTypes() public view override returns (bytes32[] memory) {
        return _supportedAssetTypes.values();
    }

    function assetType(uint256 tokenId) public view override returns (bytes32) {
        return _assetInfo.assetTypes[tokenId];
    }

    /**
     * @dev zIndex value decides the order of image layering
     */
    function zIndex(uint256 tokenId)
        public
        view
        virtual
        override
        returns (uint256)
    {
        bytes32 _assetType = _assetInfo.assetTypes[tokenId];
        uint256 zIndex_ = _collectionInfo.zIndex[_assetType];
        return zIndex_;
    }

    function isApprovedForAll(address account, address operator)
        public
        view
        virtual
        override(ERC1155, IERC1155)
        returns (bool)
    {
        return super.isApprovedForAll(account, operator) || operator == dava;
    }

    function defaultImage() external pure override returns (string memory) {}

    /**
     * @dev Return this asset class's own name.
     */
    function name() public pure virtual override returns (string memory);

    function zIndex() public pure virtual override returns (uint256);
}
