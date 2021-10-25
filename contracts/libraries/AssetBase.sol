//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

import {ERC1155Supply, ERC1155} from "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC165} from "@openzeppelin/contracts/interfaces/IERC165.sol";
import {IAsset} from "../interfaces/IAsset.sol";
import {IAvatar} from "../interfaces/IAvatar.sol";
import {OnchainMetadata} from "./OnchainMetadata.sol";

struct AssetInfo {
    mapping(uint256 => string) titles;
    mapping(uint256 => address) creators;
    mapping(uint256 => string) descriptions;
    mapping(uint256 => string) svgs;
    mapping(uint256 => uint256) maxSupply;
    mapping(uint256 => IAsset.Attribute[]) attributes;
}

abstract contract AssetBase is Ownable, ERC1155Supply, IAsset {
    using Address for address;

    string private _backgroundImgUri;
    string private _foregroundImgUri;

    AssetInfo private _info;
    uint256 public override numberOfAssets;

    constructor(
        string memory backgroundImgUri_,
        string memory foregroundImgUri_
    ) ERC1155("") Ownable() {
        _backgroundImgUri = backgroundImgUri_;
        _foregroundImgUri = foregroundImgUri_;
    }

    function create(
        string calldata title_,
        address creator_,
        string calldata description_,
        string calldata uri_,
        Attribute[] calldata attributes,
        uint256 maxSupply_
    ) external override onlyOwner {
        uint256 tokenId = numberOfAssets;
        require(_info.creators[tokenId] == address(0), "Already created");
        _info.titles[tokenId] = title_;
        _info.creators[tokenId] = creator_;
        _info.descriptions[tokenId] = description_;
        _info.svgs[tokenId] = uri_;
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
    ) public onlyOwner {
        require(totalSupply(id) + amount <= maxSupply(id), "Out of stock.");
        return super._mint(account, id, amount, data);
    }

    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public onlyOwner {
        for (uint256 i = 0; i < ids.length; i += 1) {
            uint256 id = ids[i];
            uint256 amount = amounts[i];
            require(totalSupply(id) + amount <= maxSupply(id), "Out of stock.");
        }
        return super._mintBatch(to, ids, amounts, data);
    }

    // viewers

    function uri(uint256 tokenId) public view override returns (string memory) {
        string[] memory svgs = new string[](3);
        svgs[0] = _backgroundImgUri;
        svgs[1] = _info.svgs[tokenId];
        svgs[2] = _foregroundImgUri;

        return
            OnchainMetadata.toMetadata(
                _info.titles[tokenId],
                _info.creators[tokenId],
                _info.descriptions[tokenId],
                svgs,
                _info.attributes[tokenId]
            );
    }

    function imageUri(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        return _info.svgs[tokenId];
    }

    function image(uint256 tokenId)
        external
        view
        override
        returns (string memory)
    {
        string[] memory svgs = new string[](1);
        svgs[0] = _info.svgs[tokenId];
        return OnchainMetadata.compileImages(svgs);
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
        override(ERC1155)
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
