//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Pausable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Pausable.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {IDava} from "../interfaces/IDava.sol";

contract FrozenDava is Ownable, AccessControl, ERC721Pausable {
    bytes32 public constant SWITCHER_ROLE = keccak256("SWITCHER_ROLE");

    IDava public immutable dava;

    mapping(uint256 => bool) public alreadyUsedId;
    mapping(uint256 => uint256) public originalTokenIdOf;
    mapping(uint256 => uint256) public tokenIdOfOriginal;

    constructor(
        string memory name_,
        string memory symbol_,
        IDava dava_
    ) ERC721(name_, symbol_) {
        dava = dava_;

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(SWITCHER_ROLE, msg.sender);
        _setRoleAdmin(SWITCHER_ROLE, DEFAULT_ADMIN_ROLE);
    }

    function mint(
        address receiver,
        uint256 tokenId,
        uint256 originalTokenId
    ) external onlyRole(SWITCHER_ROLE) {
        require(!alreadyUsedId[tokenId], "FrozenDava: already used tokenId");
        alreadyUsedId[tokenId] = true;
        originalTokenIdOf[tokenId] = originalTokenId;
        tokenIdOfOriginal[originalTokenId] = tokenId;

        _safeMint(receiver, tokenId, "");
    }

    function burn(uint256 tokenId) external onlyRole(SWITCHER_ROLE) {
        uint256 originalTokenId = originalTokenIdOf[tokenId];
        delete originalTokenIdOf[tokenId];
        delete tokenIdOfOriginal[originalTokenId];
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

        return dava.tokenURI(originalTokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControl, ERC721)
        returns (bool)
    {
        return
            interfaceId == type(IAccessControl).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function _transfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override {
        super._transfer(from, to, tokenId);
        dava.safeTransferFrom(from, to, originalTokenIdOf[tokenId]);
    }
}
