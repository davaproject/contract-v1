//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/IRandomBox.sol";
import "./roles/Operable.sol";

contract RandomBox is Operable, IRandomBox {
    string private constant ONLY_POS_NUMBER =
        "RandomBox: maxNumber should be greater than 0";

    uint256 private seed = 0;

    function addOperators(address[] calldata _newOperators) external {
        for (uint256 i = 0; i < _newOperators.length; i += 1) {
            addOperator(_newOperators[i]);
        }
    }

    function getRandomNumber(uint256 _maxNumber)
        external
        override
        onlyOperator
        returns (uint256 result)
    {
        require(_maxNumber > 0, ONLY_POS_NUMBER);
        result =
            uint256(
                keccak256(
                    abi.encodePacked(
                        seed,
                        block.timestamp,
                        seed,
                        block.difficulty,
                        seed
                    )
                )
            ) %
            _maxNumber;
        seed += 1;
    }
}
