//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

import {IDava} from "../interfaces/IDava.sol";
import {Asset} from "../interfaces/IAvatar.sol";
import {AvatarBase} from "../libraries/AvatarBase.sol";

import "hardhat/console.sol";

contract TestAvatarV1 is AvatarBase {
    function receiveAsset(address assetAddr, uint256 id) external {
        IDava(dava()).zap(_props().davaId, IDava.ZapReq(assetAddr, id, 1));
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
