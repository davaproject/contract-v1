//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IRandomBox.sol";

contract RandomBox is IRandomBox, AccessControl {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    uint256 private seed = 0;

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(OPERATOR_ROLE, msg.sender);
        _setRoleAdmin(OPERATOR_ROLE, DEFAULT_ADMIN_ROLE);
    }

    function getRandomNumber(uint256 _maxNumber)
        external
        override
        onlyRole(OPERATOR_ROLE)
        returns (uint256 result)
    {
        require(
            _maxNumber > 0,
            "RandomBox: maxNumber should be greater than 0"
        );
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
