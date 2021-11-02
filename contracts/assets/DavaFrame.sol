//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;

import {FrameCollection} from "../libraries/FrameCollection.sol";

contract DavaFrame is FrameCollection {
    constructor() {}

    function name() public pure returns (string memory) {
        return "dava-frame";
    }
}
