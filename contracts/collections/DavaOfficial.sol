//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;

import {IGatewayHandler} from "../interfaces/IGatewayHandler.sol";
import {PartCollection} from "../libraries/PartCollection.sol";

contract DavaOfficial is PartCollection {
    constructor(address dava_) PartCollection(dava_) {}

    function name() public pure returns (string memory) {
        return "dava-official";
    }
}
