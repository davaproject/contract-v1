//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;

import {IERC721Metadata} from "@openzeppelin/contracts/interfaces/IERC721Metadata.sol";
import {Part} from "../interfaces/IAvatar.sol";

interface IDavaV2 is IERC721Metadata {
    function mint(address to, uint256 id) external returns (address);

    function getPFP(uint256 id) external view returns (string memory);

    function isApprovedOrOwner(address spender, uint256 tokenId)
        external
        view
        returns (bool);
}
