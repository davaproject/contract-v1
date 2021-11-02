//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;

import {ERC1155Collection} from "../libraries/ERC1155Collection.sol";

contract DavaOfficial is ERC1155Collection {
    constructor(string memory baseURI_, address dava_)
        ERC1155Collection(baseURI_, dava_)
    {}

    function name() public pure returns (string memory) {
        return "dava-official";
    }
}
