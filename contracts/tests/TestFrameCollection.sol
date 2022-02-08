//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;

import {FrameCollection} from "../libraries/FrameCollection.sol";

contract TestFrameCollection is FrameCollection {
    constructor() FrameCollection() {}
}
