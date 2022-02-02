//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IDava} from "../interfaces/IDava.sol";

interface IMintablePartCollection {
    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) external;
}

contract PolygonGateway is AccessControl {
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    mapping(address => bool) public receivedMatic;
    mapping(bytes32 => bool) public isExecuted;

    uint256 public grantMaticAmount = 1 ether;

    address public immutable ethDava;
    address public immutable ethParts;
    IDava public immutable dava;
    IMintablePartCollection public immutable parts;

    event SetGrantMaticAmount(uint256 amount);

    event DavaReleased(address indexed requester, uint256[] ids);

    // To prevent malicious user, duplicate request is declined.
    // Owner should handle that case manually
    event PartsReleased(
        address indexed requester,
        uint256[] ids,
        uint256[] amounts,
        bytes32 dataHash
    );

    event GrantMatic(address indexed beneficiary, uint256 amount);

    constructor(
        address ethDava_,
        address ethParts_,
        IDava dava_,
        IMintablePartCollection parts_
    ) {
        ethDava = ethDava_;
        ethParts = ethParts_;
        dava = dava_;
        parts = parts_;

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MANAGER_ROLE, msg.sender);
        _setRoleAdmin(MANAGER_ROLE, DEFAULT_ADMIN_ROLE);
    }

    function setGrantMaticAmount(uint256 amount)
        external
        onlyRole(MANAGER_ROLE)
    {
        grantMaticAmount = amount;
        emit SetGrantMaticAmount(amount);
    }

    function batchReleaseAvatars(address requester, uint256[] calldata tokenIds)
        external
        onlyRole(MANAGER_ROLE)
    {
        _grantMatic(requester);
        for (uint256 i = 0; i < tokenIds.length; i += 1) {
            dava.mint(requester, tokenIds[i]);
        }

        emit DavaReleased(requester, tokenIds);
    }

    function batchReleaseParts(
        address requester,
        uint256[] calldata tokenIds,
        uint256[] calldata amounts,
        bytes32 ethLockTxHash
    ) external onlyRole(MANAGER_ROLE) {
        require(
            !isExecuted[ethLockTxHash],
            "PolygonGateway: already executed data"
        );

        _grantMatic(requester);
        parts.mintBatch(requester, tokenIds, amounts, "");

        emit PartsReleased(requester, tokenIds, amounts, ethLockTxHash);
    }

    function withdrawMatic(address receiver) external onlyRole(MANAGER_ROLE) {
        payable(receiver).transfer(address(this).balance);
    }

    function _grantMatic(address beneficiary) private {
        if (!receivedMatic[beneficiary]) {
            payable(beneficiary).transfer(grantMaticAmount);
            receivedMatic[beneficiary] = true;
            emit GrantMatic(beneficiary, grantMaticAmount);
        }
    }
}
