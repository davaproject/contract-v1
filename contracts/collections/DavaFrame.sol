//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;

import {IGatewayHandler} from "../interfaces/IGatewayHandler.sol";
import {FrameCollection} from "../libraries/FrameCollection.sol";

contract DavaFrame is FrameCollection {
    constructor() FrameCollection() {}

    function name() public pure returns (string memory) {
        return "dava-frame";
    }
}
