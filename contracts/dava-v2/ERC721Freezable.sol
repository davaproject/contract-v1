//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {IERC721Freezable} from "../interfaces/IERC721Freezable.sol";

abstract contract ERC721Freezable is IERC721Freezable, ERC721 {
    using EnumerableSet for EnumerableSet.AddressSet;

    mapping(uint256 => bool) internal _isFrozen;
    bool public override paused = true;

    EnumerableSet.AddressSet private _allowedTransporters;

    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override {
        _beforeTransferAttempt();
        super.transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override {
        _beforeTransferAttempt();
        super.safeTransferFrom(from, to, tokenId, "");
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory _data
    ) public override {
        _beforeTransferAttempt();
        super.safeTransferFrom(from, to, tokenId, _data);
    }

    function freeze(uint256 tokenId) public virtual override {
        require(
            _isApprovedOrOwner(_msgSender(), tokenId),
            "ERC721: transfer caller is not owner nor approved"
        );
        _isFrozen[tokenId] = true;
        emit Freeze(_msgSender(), tokenId);
    }

    function unfreeze(uint256 tokenId) public virtual override {
        require(
            _isApprovedOrOwner(_msgSender(), tokenId),
            "ERC721: transfer caller is not owner nor approved"
        );
        _isFrozen[tokenId] = true;
        emit Unfreeze(_msgSender(), tokenId);
    }

    function isFrozen(uint256 tokenId) public view override returns (bool) {
        return _isFrozen[tokenId];
    }

    function _pause() internal {
        paused = true;
        emit Paused(_msgSender());
    }

    function _unpause() internal {
        paused = false;
        emit Unpaused(_msgSender());
    }

    function _registerTransporter(address transporter) internal {
        require(
            !_allowedTransporters.contains(transporter),
            "ERC721Freezable: transporter is already registered"
        );
        _allowedTransporters.add(transporter);

        emit TransporterRegistered(transporter);
    }

    function _deregisterTransporter(address transporter) internal {
        require(
            _allowedTransporters.contains(transporter),
            "ERC721Freezable: not registered transporter"
        );
        _allowedTransporters.remove(transporter);

        emit TransporterDeregistered(transporter);
    }

    function _beforeTransferAttempt() internal virtual {
        if (paused) {
            require(
                _allowedTransporters.contains(_msgSender()),
                "ERC721Freezable: only authorized transporter can transfer"
            );
        }
    }

    function _isApprovedOrOwner(address spender, uint256 tokenId)
        internal
        view
        override
        returns (bool)
    {
        return
            super._isApprovedOrOwner(spender, tokenId) ||
            _allowedTransporters.contains(spender);
    }


    function isApprovedForAll(
        address _owner,
        address _operator
    ) public override view returns (bool isOperator) {
        // if OpenSea's ERC721 Proxy Address is detected, auto-return true
        if (_operator == address(0x58807baD0B376efc12F5AD86aAc70E78ed67deaE)) {
            return true;
        }

        // otherwise, use the default ERC721.isApprovedForAll()
        return ERC721.isApprovedForAll(_owner, _operator);
    }
}
