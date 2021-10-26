//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
import {IIPFSGateway} from "../interfaces/IIPFSGateway.sol";

contract IPFSGateway is IIPFSGateway {
    string public _gateway = "https://ipfs.io/ipfs/";

    function _setGateway(string memory gateway_) internal {
        _gateway = gateway_;
    }

    function gateway() public view override returns (string memory) {
        return _gateway;
    }

    function getURI(string memory cid)
        public
        view
        override
        returns (string memory)
    {
        return string(abi.encodePacked(_gateway, cid));
    }
}
