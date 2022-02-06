//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

import {StorageSlot} from "@openzeppelin/contracts/utils/StorageSlot.sol";
import {IERC1155} from "@openzeppelin/contracts/interfaces/IERC1155.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Account} from "./Account.sol";
import {MinimalProxy, Proxy} from "./MinimalProxy.sol";
import {IAccount} from "../interfaces/IAccount.sol";
import {IAvatar, Part} from "../interfaces/IAvatar.sol";
import {IDavaV2} from "../interfaces/IDavaV2.sol";
import {IPartCollection} from "../interfaces/IPartCollection.sol";
import {IFrameCollection} from "../interfaces/IFrameCollection.sol";
import {Transaction} from "../interfaces/IAccount.sol";
import {AvatarBase} from "./AvatarBase.sol";

abstract contract AvatarBaseV2 is AvatarBase {
    modifier onlyNotFrozen() {
        IDavaV2 _dava = IDavaV2(dava());
        require(!_dava.isFrozen(_props().davaId), "Avatar: dava is frozen");
        _;
    }

    function dress(Part[] calldata partsOn, bytes32[] calldata partsOff)
        public
        virtual
        override
        onlyNotFrozen
    {
        super.dress(partsOn, partsOff);
    }

    function execute(Transaction calldata transaction)
        public
        payable
        virtual
        override
        onlyNotFrozen
    {
        super.execute(transaction);
    }

    function batchExecute(Transaction[] calldata transactions)
        public
        payable
        virtual
        override
        onlyNotFrozen
    {
        super.batchExecute(transactions);
    }
}
