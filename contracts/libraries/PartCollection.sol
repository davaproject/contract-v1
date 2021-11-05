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
import {IPartCollection} from "../interfaces/IPartCollection.sol";
import {IAvatar} from "../interfaces/IAvatar.sol";
import {OnchainMetadata} from "./OnchainMetadata.sol";
import {URICompiler} from "./URICompiler.sol";

struct PartInfo {
    mapping(uint256 => string) titles;
    mapping(uint256 => string) descriptions;
    mapping(uint256 => string) imgURIs;
    mapping(uint256 => uint256) maxSupply;
    mapping(uint256 => IPartCollection.Attribute[]) attributes;
    mapping(uint256 => bytes32) types;
}

struct CollectionInfo {
    // part type => zIndex
    mapping(bytes32 => uint256) zIndex;
    // part type => title
    mapping(bytes32 => string) titles;
    // part type => current contract tokenId
    mapping(bytes32 => uint256) backgroundImagePart;
    // part type => current contract tokenId
    mapping(bytes32 => uint256) foregroundImagePart;
    // zIndex => bool
    mapping(uint256 => bool) zIndexExists;
}

abstract contract PartCollection is
    AccessControl,
    Ownable,
    ERC1155Supply,
    IPartCollection
{
    using Strings for uint256;
    using Address for address;
    using EnumerableSet for EnumerableSet.Bytes32Set;

    bytes32 public constant DEFAULT_PART_TYPE = keccak256("DEFAULT_PART");

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant CREATOR_ROLE = keccak256("CREATOR_ROLE");

    address public override dava;

    string public baseURI;

    PartInfo private _partInfo;
    CollectionInfo private _collectionInfo;
    uint256 public override numberOfParts;

    uint256 public maxTotalPartSupply = 0;
    uint256 public totalPartSupply = 0;

    EnumerableSet.Bytes32Set private _supportedPartTypes;

    event PartCreated(uint256 partId);

    constructor(string memory baseURI_, address dava_) ERC1155("") Ownable() {
        baseURI = baseURI_;
        dava = dava_;

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MINTER_ROLE, msg.sender);
        _setRoleAdmin(MINTER_ROLE, DEFAULT_ADMIN_ROLE);
        _setupRole(CREATOR_ROLE, msg.sender);
        _setRoleAdmin(CREATOR_ROLE, DEFAULT_ADMIN_ROLE);

        _supportedPartTypes.add(DEFAULT_PART_TYPE);
    }

    function setBaseURI(string memory baseURI_) external onlyOwner {
        baseURI = baseURI_;
    }

    function createPart(
        bytes32 partType_,
        string memory title_,
        string memory description_,
        string memory uri_,
        Attribute[] memory attributes,
        uint256 maxSupply_
    ) public virtual override onlyRole(CREATOR_ROLE) {
        uint256 tokenId = numberOfParts;
        _partInfo.titles[tokenId] = title_;
        _partInfo.descriptions[tokenId] = description_;
        _partInfo.imgURIs[tokenId] = uri_;
        _partInfo.maxSupply[tokenId] = maxSupply_;

        // default part
        require(
            _supportedPartTypes.contains(partType_),
            "Part: non existent partType"
        );
        if (partType_ == DEFAULT_PART_TYPE) {
            require(
                maxSupply_ == 0,
                "Part: maxSupply of default part should be zero"
            );
        } else {
            require(
                maxSupply_ != 0,
                "Part: maxSupply should be greater than zero"
            );
            emit PartCreated(tokenId);
        }
        _partInfo.types[tokenId] = partType_;

        for (uint256 i = 0; i < attributes.length; i += 1) {
            _partInfo.attributes[tokenId].push(attributes[i]);
        }

        numberOfParts += 1;
        maxTotalPartSupply += maxSupply_;
    }

    function createPartType(
        string memory title_,
        uint256 backgroundImageTokenId_,
        uint256 foregroundImageTokenId_,
        uint256 zIndex_
    ) public virtual override onlyRole(CREATOR_ROLE) {
        bytes32 _partType = keccak256(abi.encodePacked(title_));
        require(
            !_supportedPartTypes.contains(_partType),
            "Part: already exists partType"
        );
        require(
            !_collectionInfo.zIndexExists[zIndex_],
            "Part: already used zIndex"
        );

        require(
            _partInfo.types[backgroundImageTokenId_] == DEFAULT_PART_TYPE &&
                _partInfo.types[foregroundImageTokenId_] == DEFAULT_PART_TYPE,
            "Part: background image is not created"
        );

        _collectionInfo.zIndex[_partType] = zIndex_;
        _collectionInfo.titles[_partType] = title_;
        _collectionInfo.backgroundImagePart[
            _partType
        ] = backgroundImageTokenId_;
        _collectionInfo.foregroundImagePart[
            _partType
        ] = foregroundImageTokenId_;
        _collectionInfo.zIndexExists[zIndex_] = true;

        _supportedPartTypes.add(_partType);
    }

    function mint(
        address account,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public onlyRole(MINTER_ROLE) {
        require(
            totalSupply(id) + amount <= maxSupply(id),
            "Part: Out of stock."
        );

        totalPartSupply += amount;
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
            require(
                totalSupply(id) + amount <= maxSupply(id),
                "Part: Out of stock."
            );

            totalPartSupply += amount;
        }
        return super._mintBatch(to, ids, amounts, data);
    }

    // viewers

    function uri(uint256 tokenId) public view override returns (string memory) {
        string[] memory imgURIs = new string[](3);
        uint256 backgroundTokenId = _collectionInfo.backgroundImagePart[
            _partInfo.types[tokenId]
        ];
        uint256 foregroundTokenId = _collectionInfo.foregroundImagePart[
            _partInfo.types[tokenId]
        ];

        imgURIs[0] = _partInfo.imgURIs[backgroundTokenId];
        imgURIs[1] = _partInfo.imgURIs[tokenId];
        imgURIs[2] = _partInfo.imgURIs[foregroundTokenId];

        string memory thisAddress = uint256(uint160(address(this))).toHexString(
            20
        );
        string[] memory imgParams = new string[](1);
        imgParams[0] = "images";
        string[] memory infoParams = new string[](3);
        infoParams[0] = "info";
        infoParams[1] = thisAddress;
        infoParams[2] = tokenId.toString();

        URICompiler.Query[] memory queries = new URICompiler.Query[](3);
        queries[0] = URICompiler.Query(
            thisAddress,
            backgroundTokenId.toString()
        );
        queries[1] = URICompiler.Query(thisAddress, tokenId.toString());
        queries[2] = URICompiler.Query(
            thisAddress,
            foregroundTokenId.toString()
        );

        // partInfo => maxSupply, collection title
        Attribute[] memory attributes = new Attribute[](
            _partInfo.attributes[tokenId].length + 2
        );
        for (uint256 i = 0; i < _partInfo.attributes[tokenId].length; i += 1) {
            attributes[i] = _partInfo.attributes[tokenId][i];
        }
        attributes[_partInfo.attributes[tokenId].length] = Attribute(
            "MAX SUPPLY",
            _partInfo.maxSupply[tokenId].toString()
        );
        attributes[_partInfo.attributes[tokenId].length + 1] = Attribute(
            "TYPE",
            partTypeTitle(tokenId)
        );

        return
            OnchainMetadata.toMetadata(
                _partInfo.titles[tokenId],
                _partInfo.descriptions[tokenId],
                imgURIs,
                URICompiler.getFullUri(baseURI, imgParams, queries),
                URICompiler.getFullUri(
                    baseURI,
                    infoParams,
                    new URICompiler.Query[](0)
                ),
                attributes
            );
    }

    function description(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        return _partInfo.descriptions[tokenId];
    }

    function imageUri(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        return _partInfo.imgURIs[tokenId];
    }

    function image(uint256 tokenId)
        external
        view
        override
        returns (string memory)
    {
        string[] memory imgURIs = new string[](1);
        imgURIs[0] = _partInfo.imgURIs[tokenId];
        return OnchainMetadata.compileImages(imgURIs);
    }

    function getAllSupportedPartTypes() public view returns (bytes32[] memory) {
        return _supportedPartTypes.values();
    }

    function maxSupply(uint256 tokenId)
        public
        view
        virtual
        override
        returns (uint256)
    {
        return _partInfo.maxSupply[tokenId];
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC1155, AccessControl, IERC165)
        returns (bool)
    {
        return
            interfaceId == type(IPartCollection).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function partTypeTitle(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        bytes32 _partType = _partInfo.types[tokenId];
        return _collectionInfo.titles[_partType];
    }

    /**
     * @dev return registered part title
     */
    function partTitle(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        return _partInfo.titles[tokenId];
    }

    function partTypeInfo(bytes32 partType_)
        public
        view
        override
        returns (
            string memory title_,
            uint256 backgroundImgTokenId_,
            uint256 foregroundImgTokenId_,
            uint256 zIndex_
        )
    {
        title_ = _collectionInfo.titles[partType_];
        backgroundImgTokenId_ = _collectionInfo.backgroundImagePart[partType_];
        foregroundImgTokenId_ = _collectionInfo.foregroundImagePart[partType_];
        zIndex_ = _collectionInfo.zIndex[partType_];
    }

    function partType(uint256 tokenId) public view override returns (bytes32) {
        return _partInfo.types[tokenId];
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
        bytes32 _partType = _partInfo.types[tokenId];
        uint256 zIndex_ = _collectionInfo.zIndex[_partType];
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
}
