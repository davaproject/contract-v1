//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

import {IERC165} from "@openzeppelin/contracts/interfaces/IERC165.sol";

interface IAsset is IERC165 {
    function defaultImage() external view returns (string memory);

    function assetTypes() external view returns (bytes32[] memory);

    function assetType() external pure returns (bytes32);

    function name() external pure returns (string memory);

    function zIndex() external pure returns (uint256);
}
