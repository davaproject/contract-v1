//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {UpgradeableBeacon} from "../libraries/UpgradeableBeacon.sol";
import {MinimalProxy} from "../libraries/MinimalProxy.sol";
import {IERC721Account} from "../interfaces/IERC721Account.sol";

abstract contract ERC721Account is IERC721Account, UpgradeableBeacon {
    using Clones for address;

    address private _minimalProxy;

    constructor(address minimalProxy_) UpgradeableBeacon(minimalProxy_) {
        _minimalProxy = minimalProxy_;
    }

    function getAvatar(uint256 tokenId) public view override returns (address) {
        return
            _minimalProxy.predictDeterministicAddress(
                bytes32(tokenId),
                address(this)
            );
    }

    function _mintWithProxy(uint256 id) internal returns (address) {
        address avatar = _minimalProxy.cloneDeterministic(bytes32(id));
        MinimalProxy(payable(avatar)).initialize(id);
        return avatar;
    }
}
