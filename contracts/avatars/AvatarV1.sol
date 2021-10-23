//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

import "@openzeppelin/contracts/utils/Strings.sol";
import "../libraries/AvatarBase.sol";

contract AvatarV1 is AvatarBase {
    using Strings for uint256;

    function version() public pure override returns (string memory) {
        return "V1";
    }

    function getPFP() external view override returns (string memory) {
        return
            string(
                abi.encodePacked(
                    "https://v1.api.davaproject.com/pfp/",
                    _props().davaId.toString()
                )
            );
    }
}
