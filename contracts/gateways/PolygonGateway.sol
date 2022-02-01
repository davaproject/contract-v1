//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {IAvatar, Part} from "../interfaces/IAvatar.sol";
import {IDava} from "../interfaces/IDava.sol";

interface IMintablePartCollection {
    function mint(
        address account,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) external;
}

contract PolygonGateway is AccessControl {
    mapping(address => bool) public receivedMatic;
    mapping(address => address) public mapped1155;
    mapping(bytes32 => bool) public isExecuted;

    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    address public immutable ethDava;
    IDava public immutable dava;

    event Unlocked(
        address indexed requester,
        bytes32[] data,
        uint256 timestamp,
        bytes32 dataHash
    );

    constructor(address ethDava_, IDava dava_) {
        ethDava = ethDava_;
        dava = dava_;

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MANAGER_ROLE, msg.sender);
        _setRoleAdmin(MANAGER_ROLE, DEFAULT_ADMIN_ROLE);
    }

    function map1155(address eth1155, address polygon1155)
        external
        onlyRole(MANAGER_ROLE)
    {
        mapped1155[eth1155] = polygon1155;
    }

    function unlock(
        address requester,
        bytes32[] calldata data,
        uint256 timestamp,
        bytes32 dataHash
    ) external payable onlyRole(MANAGER_ROLE) {
        require(!isExecuted[dataHash], "PolygonGateway: already executed data");
        require(
            dataHash == keccak256(abi.encodePacked(requester, data, timestamp)),
            "PolygonGateway: invalid data"
        );

        for (uint256 i = 0; i < data.length; i += 1) {
            (
                address targetContract,
                uint256 tokenId,
                uint256 amount
            ) = decodeData(data[i]);
            if (targetContract == ethDava) {
                require(amount == 1, "PolygonGateway: invalid dava amount");
                dava.mint(requester, tokenId);
            } else if (mapped1155[targetContract] != address(0x0)) {
                IMintablePartCollection(mapped1155[targetContract]).mint(
                    requester,
                    tokenId,
                    amount,
                    ""
                );
            } else {
                revert("PolygonGateway: invalid erc1155 contract");
            }
        }

        isExecuted[dataHash] = true;
        emit Unlocked(requester, data, timestamp, dataHash);

        if (msg.value > 0) {
            if (receivedMatic[requester]) {
                payable(msg.sender).transfer(msg.value);
            } else {
                payable(requester).transfer(msg.value);
            }
        }
    }

    function decodeData(bytes32 data)
        private
        pure
        returns (
            address,
            uint256,
            uint256
        )
    {
        return (
            address(uint160(uint256(data >> 96))),
            uint256((data << 160) >> 208),
            uint256((data << 208) >> 208)
        );
    }
}
