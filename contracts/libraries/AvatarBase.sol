//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

import {StorageSlot} from "@openzeppelin/contracts/utils/StorageSlot.sol";
import {IERC1155} from "@openzeppelin/contracts/interfaces/IERC1155.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Account} from "./Account.sol";
import {MinimalProxy, Proxy} from "./MinimalProxy.sol";
import {IAccount} from "../interfaces/IAccount.sol";
import {IAvatar, Part} from "../interfaces/IAvatar.sol";
import {IDava} from "../interfaces/IDava.sol";
import {IPartCollection} from "../interfaces/IPartCollection.sol";
import {IFrameCollection} from "../interfaces/IFrameCollection.sol";

abstract contract AvatarBase is MinimalProxy, Account, IAvatar {
    using Strings for uint256;

    event PutOn(bytes32 indexed partType, address collection, uint256 id);
    event TakeOff(bytes32 indexed partType, address collection, uint256 id);

    // DO NOT DECLARE state variables in the proxy contract.
    // If you wanna access to the existing state variables, use _props().
    // If you want to add new variables, design a new struct and allocate a slot for it.

    modifier onlyOwnerOrDava() {
        require(
            msg.sender == owner() || msg.sender == dava(),
            "Avatar: only owner or Dava can call this"
        );
        _;
    }

    receive() external payable override(Proxy, Account) {}

    function setName(string memory name_)
        public
        virtual
        override
        onlyOwnerOrDava
    {
        _props().name = name_;
    }

    function dress(Part[] calldata partsOn, bytes32[] calldata partsOff)
        external
        virtual
        override
        onlyOwnerOrDava
    {
        for (uint256 i = 0; i < partsOn.length; i += 1) {
            _putOn(partsOn[i]);
        }
        for (uint256 i = 0; i < partsOff.length; i += 1) {
            _takeOff(partsOff[i]);
        }
    }

    function name()
        public
        view
        virtual
        override
        returns (string memory avatarName)
    {
        avatarName = _props().name;
        if (bytes(avatarName).length == 0) {
            avatarName = string(
                abi.encodePacked("DAVA #", _props().davaId.toString())
            );
        }
    }

    function owner() public view override returns (address) {
        return IDava(dava()).ownerOf(_props().davaId);
    }

    function dava() public view override returns (address) {
        return StorageSlot.getAddressSlot(DAVA_CONTRACT_SLOT).value;
    }

    function part(bytes32 partType) public view override returns (Part memory) {
        // Try to retrieve from the storage
        Part memory part_ = _props().parts[partType];
        if (part_.collection == address(0x0)) {
            return Part(address(0x0), 0);
        }

        // Check the balance
        bool owning = _isEligible(part_);
        // return the part only when the Avatar owns the part or return a null part.
        if (owning) {
            return part_;
        } else {
            return Part(address(0x0), 0);
        }
    }

    function allParts()
        public
        view
        virtual
        override
        returns (Part[] memory parts)
    {
        IDava _dava = IDava(dava());
        bytes32[] memory allTypes = _dava.getAllSupportedPartTypes();

        parts = new Part[](allTypes.length);
        for (uint256 i = 0; i < allTypes.length; i += 1) {
            parts[i] = part(allTypes[i]);
        }
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(Account)
        returns (bool)
    {
        return
            interfaceId == type(IAvatar).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function version() public pure virtual override returns (string memory);

    function getPFP() external view virtual override returns (string memory);

    function getMetadata()
        external
        view
        virtual
        override
        returns (string memory);

    function _putOn(Part memory part_) internal {
        bytes32 partType = IPartCollection(part_.collection).partType(part_.id);
        require(_isEligible(part_), "Avatar: does not have the part.");
        _props().parts[partType] = part_;
        emit PutOn(partType, part_.collection, part_.id);
    }

    function _takeOff(bytes32 partType) internal {
        Part memory target = _props().parts[partType];
        require(target.collection != address(0), "Avatar: nothing to take off");
        delete _props().parts[partType];
        emit TakeOff(partType, target.collection, target.id);
    }

    function _isEligible(Part memory part_)
        internal
        view
        virtual
        returns (bool)
    {
        require(
            IDava(dava()).isDavaPart(
                part_.collection,
                IPartCollection(part_.collection).partType(part_.id)
            ),
            "Avatar: not a registered part."
        );
        return (IERC1155(part_.collection).balanceOf(address(this), part_.id) >
            0);
    }
}
