//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;

import {ERC1155PresetMinterPauser} from "@openzeppelin/contracts/token/ERC1155/presets/ERC1155PresetMinterPauser.sol";
import {PartCollection} from "../libraries/PartCollection.sol";

contract TestERC1155 is ERC1155PresetMinterPauser {
    constructor(string memory uri) ERC1155PresetMinterPauser(uri) {}
}
