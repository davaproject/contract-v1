//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;

interface IERC721Account {
    function getAvatar(uint256 tokenId) external view returns (address);
}
