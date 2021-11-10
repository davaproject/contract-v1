//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;

import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {Sale, IPartCollection} from "../sales/Sale.sol";
import {IRandomBox} from "../sales/IRandomBox.sol";
import {IDava} from "../interfaces/IDava.sol";

contract TestSale is Sale {
    using EnumerableSet for EnumerableSet.UintSet;

    constructor(
        IDava dava_,
        IPartCollection davaOfficial_,
        IRandomBox randomBox_,
        uint256 presaleStart,
        uint256 presaleEnd,
        uint256 publicStart
    )
        Sale(
            dava_,
            davaOfficial_,
            randomBox_,
            presaleStart,
            presaleEnd,
            publicStart
        )
    {}

    receive() external payable {}

    function mintAvatarWithParts(uint16 avatarId) external {
        _mintAvatarWithParts(avatarId);
    }

    function verifyWhitelistSig(PreSaleReq calldata preSaleReq)
        external
        view
        returns (bool)
    {
        _verifyWhitelistSig(preSaleReq);
        return true;
    }
}
