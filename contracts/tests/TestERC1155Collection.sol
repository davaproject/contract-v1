//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;

import {PartCollection} from "../libraries/PartCollection.sol";

contract TestPartCollection is PartCollection {
    constructor(address dava_) PartCollection(dava_) {}
}
