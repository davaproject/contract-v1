//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;

interface IIPFSGateway {
    function gateway() external view returns (string memory);

    function getURI(string memory cid) external view returns (string memory);
}
