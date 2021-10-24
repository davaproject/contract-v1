//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "../libraries/AssetBase.sol";

contract EyesNFT is AssetBase, Ownable {
    struct Eyes {
        string leftEye;
        string rightEye;
    }

    constructor() ERC721("DavaEyesPack1", "DEP1") {}

    function mint(
        address to,
        uint256 id,
        string memory uri
    ) public onlyOwner {
        //
    }

    function assetType() public pure virtual override returns (bytes32) {
        return keccak256("Eyes(string leftEye,string rightEye)");
    }

    function zIndex() public pure virtual override returns (uint256) {
        return 1;
    }
}
