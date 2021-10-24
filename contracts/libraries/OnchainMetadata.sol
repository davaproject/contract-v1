//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

library OnchainMetadata {
    struct OnchainSVG {
        string svg;
        uint256 zIndex;
    }

    function toMetadata(string memory svg)
        internal
        pure
        returns (string memory)
    {}

    function compileImages(OnchainSVG[] memory svgs)
        internal
        pure
        returns (string memory)
    {}
}
