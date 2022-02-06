//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;

import {IDava, IERC721Metadata} from "./IDava.sol";

interface IDavaV2 is IDava {
    function freeze(uint256 tokenId) external;

    function unFreeze(uint256 tokenId) external;

    function isFrozen(uint256 tokenId) external view returns (bool);

    function isApprovedOrOwner(address spender, uint256 tokenId)
        external
        view
        returns (bool);

    function tokenURI(uint256 tokenId)
        external
        view
        override(IERC721Metadata)
        returns (string memory);
}
