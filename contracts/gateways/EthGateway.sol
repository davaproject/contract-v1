//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {IAvatar, Part} from "../interfaces/IAvatar.sol";
import {IDava} from "../interfaces/IDava.sol";

contract EthGateway is AccessControl {
    using EnumerableSet for EnumerableSet.AddressSet;

    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    IDava public immutable dava;
    EnumerableSet.AddressSet private erc1155List;

    event Locked(address indexed requester, bytes32[] data, bytes32 dataHash);

    constructor(IDava dava_) {
        dava = dava_;

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MANAGER_ROLE, msg.sender);
        _setRoleAdmin(MANAGER_ROLE, DEFAULT_ADMIN_ROLE);
    }

    function register1155(address erc1155) external onlyRole(MANAGER_ROLE) {
        erc1155List.add(erc1155);
    }

    function batchReceiveAvatar(uint48[] calldata tokenIds) external {
        bytes32[] memory data;

        for (uint256 i = 0; i < tokenIds.length; i += 1) {
            dava.transferFrom(msg.sender, address(this), tokenIds[i]);
            data[i] = encodeData(address(dava), tokenIds[i], 1);
        }
        emit Locked(msg.sender, data, hashData(msg.sender, data));
    }

    function batchReceive1155(
        IERC1155 erc1155,
        uint256[] calldata tokenIds,
        uint256[] calldata amounts
    ) external {
        require(
            erc1155List.contains(address(erc1155)),
            "EthGateway: invalid erc1155 contract"
        );
        require(
            tokenIds.length == amounts.length,
            "EthGateway: invalid tokenIds and amounts"
        );

        bytes32[] memory data;

        erc1155.safeBatchTransferFrom(
            msg.sender,
            address(this),
            tokenIds,
            amounts,
            ""
        );
        for (uint256 i = 0; i < tokenIds.length; i += 1) {
            data[i] = encodeData(
                address(erc1155),
                uint48(tokenIds[i]),
                uint48(amounts[i])
            );
        }
        emit Locked(msg.sender, data, hashData(msg.sender, data));
    }

    function batchTransferAvatar(address receiver, uint256[] calldata tokenIds)
        external
        onlyRole(MANAGER_ROLE)
    {
        for (uint256 i = 0; i < tokenIds.length; i += 1) {
            dava.transferFrom(address(this), receiver, tokenIds[i]);
        }
    }

    function batchTransfer1155(
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

    function encodeData(
        address addr,
        uint48 tokenId,
        uint48 amount
    ) private pure returns (bytes32) {
        assembly {
            mstore(0x00, xor(xor(shl(96, addr), shl(48, tokenId)), amount))
            return(0x00, 32)
        }
    }

    function hashData(address requester, bytes32[] memory data)
        private
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(requester, data));
    }
}
