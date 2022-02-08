//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract Test721 is ERC721 {
    uint256 public totalSupply = 0;

    constructor() ERC721("TEST NAME", "TEST SYMBOL") {}

    function mint() external {
        _mint(msg.sender, totalSupply);
        totalSupply += 1;
    }
}
