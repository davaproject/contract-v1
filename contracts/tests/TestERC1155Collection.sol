//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;

import {PartCollection} from "../libraries/PartCollection.sol";

contract TestPartCollection is PartCollection {
    constructor(string memory baseURI_, address dava_)
        PartCollection(baseURI_, dava_)
    {}
}
