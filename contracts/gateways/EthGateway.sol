//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ERC1155Receiver, ERC1155Holder, IERC1155Receiver} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";

contract EthGateway is AccessControl, ERC1155Holder {
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    IERC721 public immutable dava;
    IERC1155 public immutable parts;

    event DavaLocked(address indexed requester, uint256[] ids);

    event PartsLocked(
        address indexed requester,
        uint256[] ids,
        uint256[] amounts
    );

    constructor(IERC721 dava_, IERC1155 parts_) {
        dava = dava_;
        parts = parts_;

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MANAGER_ROLE, msg.sender);
        _setRoleAdmin(MANAGER_ROLE, DEFAULT_ADMIN_ROLE);
    }

    function batchLockAvatars(address requester, uint256[] calldata tokenIds)
        external
    {
        for (uint256 i = 0; i < tokenIds.length; i += 1) {
            dava.transferFrom(requester, address(this), tokenIds[i]);
        }
        emit DavaLocked(requester, tokenIds);
    }

    function batchLockParts(
        address requester,
        uint256[] calldata tokenIds,
        uint256[] calldata amounts
    ) external {
        require(
            tokenIds.length == amounts.length,
            "EthGateway: invalid tokenIds and amounts"
        );

        parts.safeBatchTransferFrom(
            requester,
            address(this),
            tokenIds,
            amounts,
            ""
        );

        emit PartsLocked(requester, tokenIds, amounts);
    }

    function batchTransferAvatars(address receiver, uint256[] calldata tokenIds)
        external
        onlyRole(MANAGER_ROLE)
    {
        for (uint256 i = 0; i < tokenIds.length; i += 1) {
            dava.transferFrom(address(this), receiver, tokenIds[i]);
        }
    }

    function batchTransferParts(
        address receiver,
        IERC1155 erc1155,
        uint256[] calldata tokenIds,
        uint256[] calldata amounts
    ) external onlyRole(MANAGER_ROLE) {
        erc1155.safeBatchTransferFrom(
            address(this),
            receiver,
            tokenIds,
            amounts,
            ""
        );
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155Receiver, AccessControl)
        returns (bool)
    {
        return
            interfaceId == type(IERC1155Receiver).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
