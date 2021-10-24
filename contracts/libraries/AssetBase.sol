//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

import {ERC721Enumerable, ERC721} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {IERC165} from "@openzeppelin/contracts/interfaces/IERC165.sol";
import {IAsset} from "../interfaces/IAsset.sol";
import {IAvatar} from "../interfaces/IAvatar.sol";

abstract contract AssetBase is ERC721Enumerable, IAsset {
    using Address for address;

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override {
        super._beforeTokenTransfer(from, to, tokenId);
        if (!from.isContract()) return;

        if (!IERC165(from).supportsInterface(type(IAvatar).interfaceId)) return;

        (address assetAddr, uint256 assetId) = IAvatar(from).asset(assetType());
        if (assetAddr == address(this) && assetId == tokenId) {
            try IAvatar(from).takeOff(assetType()) {} catch {}
        }
    }

    function assetType() public pure virtual override returns (bytes32);

    function zIndex() public view virtual override returns (uint256);
}
