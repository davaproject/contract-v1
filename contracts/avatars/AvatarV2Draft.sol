//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

import {BeaconProxy} from "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {AvatarBase} from "../libraries/AvatarBase.sol";

contract AvatarV2Draft is AvatarBase {
    using Strings for uint256;

    function testChangeName(string memory val) public {
        _props().name = val;
    }

    function version() public pure override returns (string memory) {
        return "V2";
    }

    function getMetadata() external view override returns (string memory) {
        return
            string(
                abi.encodePacked(
                    "https://api.v2.davaproject.com/metadata/",
                    _props().davaId.toString()
                )
            );
    }

    function getPFP() external view override returns (string memory) {
        return
            string(
                abi.encodePacked(
                    "https://api.v2.davaproject.com/pfp/",
                    _props().davaId.toString()
                )
            );
    }
}
