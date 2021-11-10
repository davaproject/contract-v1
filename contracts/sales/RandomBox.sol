//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;

import "hardhat/console.sol";

contract RandomBox {
    bytes32[313] internal _aPartIds;
    bytes32[313] internal _bPartIds;
    bytes32[313] internal _cPartIds;

    uint256 internal _seed = 0;
    address private _owner;

    constructor() {
        _owner = msg.sender;
    }

    modifier onlyOwner() {
        require(_owner == msg.sender, "RandomBox: only owner can run this");
        _;
    }

    function setSeed() external onlyOwner {
        _seed = block.timestamp;
    }

    function setA(bytes32[313] calldata aPartIds_) external onlyOwner {
        for (uint256 i = 0; i < 313; i += 1) {
            _aPartIds[i] = aPartIds_[i];
        }
    }

    function setB(bytes32[313] calldata bPartIds_) external onlyOwner {
        for (uint256 i = 0; i < 313; i += 1) {
            _bPartIds[i] = bPartIds_[i];
        }
    }

    function setC(bytes32[313] calldata cPartIds_) external onlyOwner {
        for (uint256 i = 0; i < 313; i += 1) {
            _cPartIds[i] = cPartIds_[i];
        }
    }

    function getPartIds(uint256 index)
        external
        view
        returns (uint256[] memory)
    {
        uint256 compiledSeed = (index + _seed) % 10000;
        uint256 motherIndex = (compiledSeed) / 32;
        uint256 childShifter = ((compiledSeed) % 32) * 8;

        uint256[] memory partIds = new uint256[](3);
        partIds[0] = uint256(
            uint8(bytes1(_aPartIds[motherIndex] << (childShifter)))
        );
        partIds[1] = uint256(
            uint8(bytes1(_bPartIds[motherIndex] << (childShifter)))
        );
        partIds[2] = uint256(
            uint8(bytes1(_cPartIds[motherIndex] << (childShifter)))
        );
        return partIds;
    }
}
