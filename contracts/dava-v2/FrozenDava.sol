//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";
import {IAvatar} from "../interfaces/IAvatar.sol";
import {IDava} from "../interfaces/IDava.sol";

contract FrozenDava is Ownable, AccessControl, Pausable, ERC721Enumerable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    IDava public dava;

    mapping(uint256 => bool) public alreadyUsedId;
    mapping(uint256 => uint256) public originalTokenIdOf;

    constructor(IDava dava_) ERC721("Dava", "DAVA") Ownable() {
        dava = dava_;

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MINTER_ROLE, msg.sender);
        _setRoleAdmin(MINTER_ROLE, DEFAULT_ADMIN_ROLE);
    }

    function mint(
        address receiver,
        uint256 tokenId,
        uint256 originalTokenId
    ) external onlyRole(MINTER_ROLE) {
        require(!alreadyUsedId[tokenId], "FrozenDava: already used tokenId");
        alreadyUsedId[tokenId] = true;
        originalTokenIdOf[tokenId] = originalTokenId;

        _safeMint(receiver, tokenId);
    }

    function burn(uint256 tokenId) external onlyRole(MINTER_ROLE) {
        delete originalTokenIdOf[tokenId];
        _burn(tokenId);
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

        uint256 originalTokenId = originalTokenIdOf[tokenId];

        return IAvatar(dava.getAvatar(originalTokenId)).getMetadata();
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(AccessControl, ERC721Enumerable)
        returns (bool)
    {
        return
            interfaceId == type(IAccessControl).interfaceId ||
            interfaceId == type(IERC165).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override {
        super._beforeTokenTransfer(from, to, tokenId);
        require(!paused(), "ERC721Pausable: token transfer while paused");
    }
}
