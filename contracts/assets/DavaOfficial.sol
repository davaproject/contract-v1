//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;

import {AssetCollection} from "../libraries/AssetCollection.sol";

contract DavaOfficial is AssetCollection {
    constructor(string memory baseURI_, address dava_)
        AssetCollection(baseURI_, dava_)
    {}

    function name() public pure returns (string memory) {
        return "dava-official";
    }
}
