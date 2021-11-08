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

    function amountOfGroups(bytes3 partTypeGroup)
        external
        view
        returns (uint256)
    {
        return _amountOfGroups[partTypeGroup];
    }

    function groups() external view returns (bytes3[] memory) {
        return _groups;
    }

    function partIds(bytes1 partTypeIndex)
        external
        view
        returns (uint256[] memory)
    {
        uint256 amount = _partIds[partTypeIndex].length();
        uint256[] memory partIds_ = new uint256[](amount);

        for (uint256 i = 0; i < _partIds[partTypeIndex].length(); i += 1) {
            partIds_[i] = _partIds[partTypeIndex].at(i);
        }
        return partIds_;
    }

    function mintAvatarWithParts(uint256 avatarId) external {
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

    function retrievePartIds() external returns (uint256[] memory) {
        return _retrievePartIds();
    }
}
