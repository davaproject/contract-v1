//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

struct Part {
    address collection;
    uint96 id;
}

interface IAvatar {
    function dress(Part[] calldata partsOn, bytes32[] calldata partsOff)
        external;

    function version() external view returns (string memory);

    function dava() external view returns (address);

    function part(bytes32 partType) external view returns (Part memory);

    function allParts() external view returns (Part[] memory parts);

    function getPFP() external view returns (string memory);

    function getMetadata() external view returns (string memory);
}
