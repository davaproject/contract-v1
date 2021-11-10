//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;

import {URICompiler} from "../libraries/URICompiler.sol";

contract TestURICompiler {
    function getFullUri(
        string memory host,
        string[] memory params,
        URICompiler.Query[] memory queries
    ) external pure returns (string memory) {
        return URICompiler.getFullUri(host, params, queries);
    }
}
