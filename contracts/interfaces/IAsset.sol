//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

import {IERC165} from "@openzeppelin/contracts/interfaces/IERC165.sol";

interface ITransferableAsset is IERC165 {
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) external;

    function balanceOf(address account, uint256 tokenId)
        external
        view
        returns (uint256);
}

interface IAsset is IERC165 {
    function defaultImage() external view returns (string memory);

    function assetTypes() external view returns (bytes32[] memory);

    function assetType() external pure returns (bytes32);

    function name() external pure returns (string memory);

    function zIndex() external pure returns (uint256);
}
