//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

import {IDava} from "../interfaces/IDava.sol";
import {Part} from "../interfaces/IAvatar.sol";
import {AvatarBase} from "../libraries/AvatarBase.sol";

contract TestAvatarV1 is AvatarBase {
    function receivePart(address collection, uint256 id) external {
        Part[] memory parts = new Part[](1);
        parts[0] = Part(collection, uint96(id));
        IDava(dava()).zap(_props().davaId, parts, new bytes32[](0));
    }

    function version() public pure override returns (string memory) {
        return "V1";
    }

    function getPFP() external pure override returns (string memory) {
        return "";
    }

    function getMetadata() external pure override returns (string memory) {
        return "";
    }
}
