//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;

contract RandomBox {
    bytes32[358] internal _aPartIds;
    bytes32[358] internal _bPartIds;
    bytes32[358] internal _cPartIds;

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

    function setA(bytes32[358] calldata aPartIds_) external onlyOwner {
        for (uint256 i = 0; i < 358; i += 1) {
            _aPartIds[i] = aPartIds_[i];
        }
    }

    function setB(bytes32[358] calldata bPartIds_) external onlyOwner {
        for (uint256 i = 0; i < 358; i += 1) {
            _bPartIds[i] = bPartIds_[i];
        }
    }

    function setC(bytes32[358] calldata cPartIds_) external onlyOwner {
        for (uint256 i = 0; i < 358; i += 1) {
            _cPartIds[i] = cPartIds_[i];
        }
    }

    function getPartIds(uint256 index)
        external
        view
        returns (uint256[] memory)
    {
        uint256 compiledSeed = (index + _seed) % 10000;
        uint256 motherIndex = (compiledSeed) / 28;
        uint256 childShifter = ((compiledSeed) % 28) * 9;

        uint256[] memory partIds = new uint256[](3);
        partIds[0] = uint256(
            uint16(bytes2((_aPartIds[motherIndex] << (childShifter)) >> 7))
        );
        partIds[1] = uint256(
            uint16(bytes2((_bPartIds[motherIndex] << (childShifter)) >> 7))
        );
        partIds[2] = uint256(
            uint16(bytes2((_cPartIds[motherIndex] << (childShifter)) >> 7))
        );
        return partIds;
    }
}
