// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

abstract contract Operable is Ownable {
    string private constant NON_OPERATOR =
        "Operable: caller is not the operator";
    string private constant NO_ZERO_ADDRESS =
        "Operable: new operator is the zero address";
    string private constant ALREADY_REGISTERED =
        "Operable: operator already registered";
    string private constant NON_REGISTERED =
        "Operable: operator is not registered";

    using EnumerableSet for EnumerableSet.AddressSet;

    EnumerableSet.AddressSet _operators;

    event AddOperator(address indexed _operator);
    event RemoveOperator(address indexed _operator);

    function operators() public view virtual returns (address[] memory) {
        return _operators.values();
    }

    modifier onlyOperator() {
        require(_operators.contains(msg.sender), NON_OPERATOR);
        _;
    }

    function isOperable(address _address) public view virtual returns (bool) {
        return _operators.contains(_address);
    }

    function addOperator(address _newOperator) public virtual onlyOwner {
        require(_newOperator != address(0), NO_ZERO_ADDRESS);
        require(!_operators.contains(_newOperator), ALREADY_REGISTERED);

        _operators.add(_newOperator);
        emit AddOperator(_newOperator);
    }

    function removeOperator(address _targetOperator) public virtual onlyOwner {
        require(_operators.contains(_targetOperator), NON_REGISTERED);

        _operators.remove(_targetOperator);
        emit RemoveOperator(_targetOperator);
    }
}
