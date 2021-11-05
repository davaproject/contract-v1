//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

import {IERC721Enumerable} from "@openzeppelin/contracts/interfaces/IERC721Enumerable.sol";
import {IHost} from "../interfaces/IHost.sol";

interface IDava is IERC721Enumerable, IHost {
    struct ZapReq {
        address collection;
        uint256 partId;
        uint256 amount;
    }

    function mint(address to, uint256 id) external;

    function registerCollection(address collection) external;

    function registerPartType(bytes32 partType) external;

    function registerFrameCollection(address collection) external;

    function deregisterCollection(address collection) external;

    function deregisterPartType(bytes32 partType) external;

    function zap(uint256 tokenId, ZapReq calldata zapReq) external;

    function zap(uint256 tokenId, ZapReq[] calldata zapReqs) external;

    function frameCollection() external view returns (address);

    function isRegisteredCollection(address collection)
        external
        view
        returns (bool);

    function isSupportedPartType(bytes32 partType) external view returns (bool);

    function isDavaPart(address collection, bytes32 partType)
        external
        view
        returns (bool);

    function getAvatar(uint256 id) external view returns (address);

    function getAllSupportedPartTypes()
        external
        view
        returns (bytes32[] memory);

    function getRegisteredCollections()
        external
        view
        returns (address[] memory);

    function getPFP(uint256 id) external view returns (string memory);
}
