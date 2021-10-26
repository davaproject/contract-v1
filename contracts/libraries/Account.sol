//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {ERC721Holder} from "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import {ERC1155Holder, ERC1155Receiver} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/interfaces/IERC721Receiver.sol";
import {IERC1271} from "@openzeppelin/contracts/interfaces/IERC1271.sol";
import {Transaction, IAccount} from "../interfaces/IAccount.sol";

abstract contract Account is
    Context,
    ERC721Holder,
    ERC1155Holder,
    IERC1271,
    IAccount
{
    using ECDSA for bytes32;

    uint256 private _nonce;

    event Executed(
        address to,
        uint256 value,
        uint256 nonce,
        bytes data
    );

    constructor() {}

    modifier onlyOwner() {
        require(
            owner() == _msgSender() || address(this) == _msgSender(),
            "Acocunt: only owner can call"
        );
        _;
    }

    function execute(Transaction calldata transaction)
        public
        payable
        virtual
        override
        onlyOwner
    {
        _call(transaction);
    }

    function batchExecute(Transaction[] calldata transactions)
        public
        payable
        virtual
        override
        onlyOwner
    {
        for (uint256 i = 0; i < transactions.length; i += 1) {
            _call(transactions[i]);
        }
    }

    function isValidSignature(bytes32 hash, bytes memory signature)
        external
        view
        override
        returns (bytes4 magicValue)
    {
        return
            (owner() == hash.recover(signature))
                ? IERC1271.isValidSignature.selector
                : bytes4(0xffffffff);
    }

    function nonce() public view virtual override returns (uint256) {
        return _nonce;
    }

    function owner() public view virtual override returns (address);

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC1155Receiver)
        returns (bool)
    {
        return
            interfaceId == type(IERC1271).interfaceId ||
            interfaceId == type(IERC721Receiver).interfaceId ||
            interfaceId == type(IAccount).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function _call(Transaction memory transaction) internal {
        require(transaction.nonce == _nonce, "Account: invalid nonce");
        _nonce += 1;
        (bool success, ) = transaction.to.call{value: transaction.value}(
            transaction.data
        );
        require(success, "Account: transaction reverted");
        emit Executed(
            transaction.to,
            transaction.value,
            transaction.nonce,
            transaction.data
        );
    }
}
