//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

struct Part {
    address collection;
    uint256 id;
}

interface IAvatar {
    function setName(string memory name_) external;

    function dress(Part[] calldata partsOn, bytes32[] calldata partsOff)
        external;

    function name() external view returns (string memory);

    function version() external view returns (string memory);

    function dava() external view returns (address);

    function part(bytes32 partType) external view returns (Part memory);

    function allParts() external view returns (Part[] memory parts);

    function getPFP() external view returns (string memory);

    function getMetadata() external view returns (string memory);
}
