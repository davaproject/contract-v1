//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract Test1155 is ERC1155 {
    uint256 public totalSupply = 0;

    constructor() ERC1155("TEST") {}

    function mint(uint256 id, uint256 amount) external {
        _mint(msg.sender, id, amount, "");
    }
}
