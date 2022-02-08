//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC721, IERC721Metadata} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {Part, IAvatar} from "../interfaces/IAvatar.sol";
import {IDavaV2} from "../interfaces/IDavaV2.sol";
import {ERC721Account} from "./ERC721Account.sol";
import {ERC721Freezable, IERC721Freezable} from "./ERC721Freezable.sol";
import {Wearable} from "./Wearable.sol";
import {ContextMixin} from "./ContextMixin.sol";

contract DavaV2 is
    IDavaV2,
    Ownable,
    AccessControl,
    Wearable,
    ERC721Account,
    ERC721Freezable,
    ContextMixin
{
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PART_MANAGER_ROLE = keccak256("PART_MANAGER_ROLE");
    bytes32 public constant UPGRADE_MANAGER_ROLE =
        keccak256("UPGRADE_MANAGER_ROLE");
    bytes32 public constant TRANSPORTER_MANAGER_ROLE =
        keccak256("TRANSPORTER_MANAGER_ROLE");

    string public baseURI = "https://ipfs.io/ipfs/";
    uint48 public constant MAX_SUPPLY = 10000;

    // DAO contract owns this registry
    constructor(address minimalProxy_)
        ERC721("Dava", "DAVA")
        ERC721Account(minimalProxy_)
        Ownable()
    {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MINTER_ROLE, msg.sender);
        _setRoleAdmin(MINTER_ROLE, DEFAULT_ADMIN_ROLE);
        _setupRole(PART_MANAGER_ROLE, msg.sender);
        _setRoleAdmin(PART_MANAGER_ROLE, DEFAULT_ADMIN_ROLE);
        _setupRole(UPGRADE_MANAGER_ROLE, msg.sender);
        _setRoleAdmin(UPGRADE_MANAGER_ROLE, DEFAULT_ADMIN_ROLE);
        _setupRole(TRANSPORTER_MANAGER_ROLE, msg.sender);
        _setRoleAdmin(TRANSPORTER_MANAGER_ROLE, DEFAULT_ADMIN_ROLE);
    }

    function setBaseURI(string calldata baseURI_)
        external
        onlyRole(UPGRADE_MANAGER_ROLE)
    {
        baseURI = baseURI_;
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function freeze(uint256 tokenId)
        public
        override
        onlyRole(TRANSPORTER_MANAGER_ROLE)
    {
        super.freeze(tokenId);
    }

    function unfreeze(uint256 tokenId)
        public
        override
        onlyRole(TRANSPORTER_MANAGER_ROLE)
    {
        super.unfreeze(tokenId);
    }

    function upgradeTo(address newImplementation)
        external
        onlyRole(UPGRADE_MANAGER_ROLE)
    {
        _upgradeTo(newImplementation);
    }

    function registerCollection(address collection)
        external
        onlyRole(PART_MANAGER_ROLE)
    {
        _registerCollection(collection);
    }

    function registerCategory(bytes32 categoryId)
        external
        onlyRole(PART_MANAGER_ROLE)
    {
        _registerCategory(categoryId);
    }

    function registerFrameCollection(address collection)
        external
        onlyRole(PART_MANAGER_ROLE)
    {
        _registerFrameCollection(collection);
    }

    function registerTransporter(address transporter)
        external
        onlyRole(TRANSPORTER_MANAGER_ROLE)
    {
        _registerTransporter(transporter);
    }

    function deregisterTransporter(address transporter)
        external
        onlyRole(TRANSPORTER_MANAGER_ROLE)
    {
        _deregisterTransporter(transporter);
    }

    function deregisterCollection(address collection)
        external
        onlyRole(PART_MANAGER_ROLE)
    {
        _deregisterCollection(collection);
    }

    function deregisterCategory(bytes32 categoryId)
        external
        onlyRole(PART_MANAGER_ROLE)
    {
        _deregisterCategory(categoryId);
    }

    function zap(
        uint256 tokenId,
        Part[] calldata partsOn,
        bytes32[] calldata partsOff
    ) external {
        require(
            msg.sender == ownerOf(tokenId),
            "Dava: msg.sender is not the owner of avatar"
        );
        address avatarAddress = getAvatar(tokenId);
        IAvatar avatar = IAvatar(avatarAddress);
        for (uint256 i = 0; i < partsOff.length; i += 1) {
            Part memory equippedPart = avatar.part(partsOff[i]);
            IERC1155 collection = IERC1155(equippedPart.collection);
            if (
                equippedPart.collection != address(0x0) &&
                collection.balanceOf(avatarAddress, equippedPart.id) > 0
            ) {
                collection.safeTransferFrom(
                    avatarAddress,
                    msg.sender,
                    equippedPart.id,
                    1,
                    ""
                );
            }
        }

        for (uint256 i = 0; i < partsOn.length; i += 1) {
            IERC1155 collection = IERC1155(partsOn[i].collection);
            require(
                collection.supportsInterface(type(IERC1155).interfaceId),
                "Dava: collection is not an erc1155 format"
            );
            require(
                collection.balanceOf(msg.sender, partsOn[i].id) >= 1,
                "Dava: owner does not hold the part"
            );
            collection.safeTransferFrom(
                msg.sender,
                avatarAddress,
                partsOn[i].id,
                1,
                ""
            );
        }

        IAvatar(getAvatar(tokenId)).dress(partsOn, partsOff);
    }

    function mint(address to, uint256 id)
        external
        override
        onlyRole(MINTER_ROLE)
        returns (address)
    {
        require(id < uint256(MAX_SUPPLY), "Dava: Invalid id");
        super._mint(to, id);
        return _mintWithProxy(id);
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

    function isApprovedOrOwner(address spender, uint256 tokenId)
        external
        view
        override
        returns (bool)
    {
        return _isApprovedOrOwner(spender, tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(IERC721Metadata, ERC721)
        returns (string memory)
    {
        require(
            _exists(tokenId),
            "ERC721Metadata: URI query for nonexistent token"
        );
        return IAvatar(getAvatar(tokenId)).getMetadata();
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(IERC165, AccessControl, ERC721)
        returns (bool)
    {
        return
            interfaceId == type(IDavaV2).interfaceId ||
            interfaceId == type(IAccessControl).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /**
     * This is used instead of msg.sender as transactions won't be sent by the original token owner, but by OpenSea.
     */
    function _msgSender()
        internal
        override
        view
        returns (address sender)
    {
        return ContextMixin.msgSender();
    }
}
