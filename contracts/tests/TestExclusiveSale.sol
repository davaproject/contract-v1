//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;

import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {ExclusiveSale, IPartCollection} from "../sales/ExclusiveSale.sol";
import {IRandomBox} from "../sales/IRandomBox.sol";
import {IDava} from "../interfaces/IDava.sol";

contract TestExclusiveSale is ExclusiveSale {
    constructor(
        IDava dava_,
        IPartCollection davaOfficial_,
        IRandomBox randomBox_
    ) ExclusiveSale(dava_, davaOfficial_, randomBox_) {}

    receive() external payable {}

    function nextAvatarId() public view returns (uint16) {
        return _nextAvatarId;
    }

    function verifySig(MintReq calldata mintReq) external view returns (bool) {
        _verifySig(mintReq);
        return true;
    }
}
