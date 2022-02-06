//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {IDavaV2} from "../interfaces/IDavaV2.sol";
import {IFrozenDava} from "../interfaces/IFrozenDava.sol";

contract Switcher is Context, AccessControl {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    IDavaV2 public dava;
    IFrozenDava public frozenDava;

    constructor() {
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
            dava.isApprovedOrOwner(_msgSender(), tokenId),
            "Switcher: caller is not owner nor approved"
        );

        dava.freeze(tokenId);
        frozenDava.mint(dava.ownerOf(tokenId), generateId(tokenId), tokenId);
    }

    function unFreeze(uint256 tokenId) external {
        require(
            frozenDava.tokenIdOfOriginal(tokenId) != 0,
            "Switcher: requested token is not frozen"
        );
        require(dava.isApprovedOrOwner(_msgSender(), tokenId));

        frozenDava.burn(frozenDava.tokenIdOfOriginal(tokenId));
        dava.unFreeze(tokenId);
    }

    function generateId(uint256 tokenId) private view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(tokenId, block.number)));
    }
}
