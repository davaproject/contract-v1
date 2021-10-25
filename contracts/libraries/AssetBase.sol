//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

import {ERC1155Supply, ERC1155} from "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC165} from "@openzeppelin/contracts/interfaces/IERC165.sol";
import {IAsset} from "../interfaces/IAsset.sol";
import {IAvatar} from "../interfaces/IAvatar.sol";
import {OnchainMetadata} from "./OnchainMetadata.sol";

struct AssetInfo {
    mapping(uint256 => string) titles;
    mapping(uint256 => address) creators;
    mapping(uint256 => string) descriptions;
    mapping(uint256 => string) imgURIs;
    mapping(uint256 => uint256) maxSupply;
    mapping(uint256 => IAsset.Attribute[]) attributes;
}

abstract contract AssetBase is AccessControl, ERC1155Supply, IAsset {
    using Address for address;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant CREATOR_ROLE = keccak256("CREATOR_ROLE");

    string private _backgroundImgUri;
    string private _foregroundImgUri;

    AssetInfo private _info;
    uint256 public override numberOfAssets;

    constructor(
        string memory backgroundImgUri_,
        string memory foregroundImgUri_,
        string memory frameImgUri_
    ) ERC1155("") {
        _backgroundImgUri = backgroundImgUri_;
        _foregroundImgUri = foregroundImgUri_;

        if (bytes(frameImgUri_).length == 0) {
            numberOfAssets += 1;
        } else {
            create("", msg.sender, "", frameImgUri_, (new Attribute[](0)), 0);
        }

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MINTER_ROLE, msg.sender);
        _setRoleAdmin(MINTER_ROLE, DEFAULT_ADMIN_ROLE);
        _setupRole(CREATOR_ROLE, msg.sender);
        _setRoleAdmin(CREATOR_ROLE, DEFAULT_ADMIN_ROLE);
    }

    function create(
        string memory title_,
        address creator_,
        string memory description_,
        string memory uri_,
        Attribute[] memory attributes,
        uint256 maxSupply_
    ) public override onlyRole(CREATOR_ROLE) {
        uint256 tokenId = numberOfAssets;
        require(_info.creators[tokenId] == address(0), "Already created");
        _info.titles[tokenId] = title_;
        _info.creators[tokenId] = creator_;
        _info.descriptions[tokenId] = description_;
        _info.imgURIs[tokenId] = uri_;
        _info.maxSupply[tokenId] = maxSupply_;

        for (uint256 i = 0; i < attributes.length; i += 1) {
            _info.attributes[tokenId].push(attributes[i]);
        }

        numberOfAssets = tokenId + 1;
    }

    function mint(
        address account,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public onlyRole(MINTER_ROLE) {
        require(totalSupply(id) + amount <= maxSupply(id), "Out of stock.");
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
        }
        return super._mintBatch(to, ids, amounts, data);
    }

    // viewers

    function uri(uint256 tokenId) public view override returns (string memory) {
        string[] memory imgURIs = new string[](3);
        imgURIs[0] = _backgroundImgUri;
        imgURIs[1] = _info.imgURIs[tokenId];
        imgURIs[2] = _foregroundImgUri;

        return
            OnchainMetadata.toMetadata(
                _info.titles[tokenId],
                _info.creators[tokenId],
                _info.descriptions[tokenId],
                imgURIs,
                _info.attributes[tokenId]
            );
    }

    function imageUri(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        return _info.imgURIs[tokenId];
    }

    function image(uint256 tokenId)
        external
        view
        override
        returns (string memory)
    {
        string[] memory imgURIs = new string[](1);
        imgURIs[0] = _info.imgURIs[tokenId];
        return OnchainMetadata.compileImages(imgURIs);
    }

    function creator(uint256 tokenId)
        public
        view
        virtual
        override
        returns (address)
    {
        return _info.creators[tokenId];
    }

    function maxSupply(uint256 tokenId)
        public
        view
        virtual
        override
        returns (uint256)
    {
        return _info.maxSupply[tokenId];
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return
            interfaceId == type(IAsset).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /**
     * @dev Return this asset class's own name.
     */
    function name() public pure virtual override returns (string memory);

    /**
     * @dev implement using ERC165 Type Hash standard
     */
    function assetType() public pure virtual override returns (bytes32);

    /**
     * @dev zIndex value decides the order of image layering
     */
    function zIndex() public pure virtual override returns (uint256);
}
