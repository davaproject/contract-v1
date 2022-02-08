//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {IERC721Freezable} from "../interfaces/IERC721Freezable.sol";
import {IDavaV2} from "../interfaces/IDavaV2.sol";
import {IFrozenDava} from "../interfaces/IFrozenDava.sol";

contract Switcher is Context, AccessControl {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    address public dava;
    IFrozenDava public frozenDava;

    constructor(address dava_, IFrozenDava frozenDava_) {
        dava = dava_;
        frozenDava = frozenDava_;

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(OPERATOR_ROLE, msg.sender);
        _setRoleAdmin(OPERATOR_ROLE, DEFAULT_ADMIN_ROLE);
    }

    function freeze(uint256 tokenId) external {
        require(
            frozenDava.tokenIdOfOriginal(tokenId) == 0,
            "Switcher: requested token is already frozen"
        );
        require(
            IDavaV2(dava).isApprovedOrOwner(_msgSender(), tokenId),
            "Switcher: caller is not owner nor approved"
        );

        IERC721Freezable(dava).freeze(tokenId);
        frozenDava.mint(
            IDavaV2(dava).ownerOf(tokenId),
            generateId(tokenId),
            tokenId
        );
    }

    function unFreeze(uint256 tokenId) external {
        require(
            frozenDava.tokenIdOfOriginal(tokenId) != 0,
            "Switcher: requested token is not frozen"
        );
        require(IDavaV2(dava).isApprovedOrOwner(_msgSender(), tokenId));

        frozenDava.burn(frozenDava.tokenIdOfOriginal(tokenId));
        IERC721Freezable(dava).unfreeze(tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) external {
        require(IDavaV2(dava).isApprovedOrOwner(_msgSender(), tokenId));
        require(!IERC721Freezable(dava).isFrozen(tokenId));

        IDavaV2(dava).safeTransferFrom(from, to, tokenId, "");
    }

    function generateId(uint256 tokenId) private view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(tokenId, block.number)));
    }
}
