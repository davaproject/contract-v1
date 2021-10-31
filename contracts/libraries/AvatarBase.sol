//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

import {StorageSlot} from "@openzeppelin/contracts/utils/StorageSlot.sol";
import {IERC1155} from "@openzeppelin/contracts/interfaces/IERC1155.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Account} from "./Account.sol";
import {MinimalProxy, Proxy} from "./MinimalProxy.sol";
import {ICollection} from "../interfaces/ICollection.sol";
import {IAccount} from "../interfaces/IAccount.sol";
import {IAvatar, Asset} from "../interfaces/IAvatar.sol";
import {IDava} from "../interfaces/IDava.sol";
import {IERC1155Collection} from "../interfaces/IERC1155Collection.sol";

abstract contract AvatarBase is MinimalProxy, Account, IAvatar {
    using Strings for uint256;

    event PutOn(bytes32 indexed assetType, address asset, uint256 id);
    event TakeOff(bytes32 indexed assetType, address asset, uint256 id);

    // DO NOT DECLARE state variables in the proxy contract.
    // If you wanna access to the existing state variables, use _props().
    // If you want to add new variables, design a new struct and allocate a slot for it.

    receive() external payable override(Proxy, Account) {}

    function setName(string memory name_) public virtual override onlyOwner {
        _props().name = name_;
    }

    function dress(Asset[] calldata assets)
        external
        virtual
        override
        onlyOwner
    {
        for (uint256 i = 0; i < assets.length; i += 1) {
            if (assets[i].assetAddr == address(0x0)) {
                _takeOff(assets[i].assetType);
            } else {
                _putOn(assets[i]);
            }
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

    function asset(bytes32 assetType)
        public
        view
        override
        returns (Asset memory)
    {
        // Try to retrieve from the storage
        Asset memory asset_ = _props().assets[assetType];
        if (asset_.assetAddr == address(0x0)) {
            return Asset(assetType, asset_.assetAddr, 0);
        }

        // Check the balance
        bool owning = _isEligible(asset_);
        // return the asset only when the Avatar owns the asset or return a null asset.
        if (owning) {
            return asset_;
        } else {
            return Asset(assetType, asset_.assetAddr, 0);
        }
    }

    function allAssets()
        public
        view
        virtual
        override
        returns (Asset[] memory assets)
    {
        bytes32[] memory allTypes = IDava(dava()).getAllSupportedAssetTypes();
        bytes32[] memory allDefaultCollectionTypes = IDava(dava())
            .getAllSupportedDefaultCollectionTypes();

        assets = new Asset[](
            allTypes.length + allDefaultCollectionTypes.length
        );
        for (uint256 i = 0; i < allTypes.length; i += 1) {
            assets[i] = asset(allTypes[i]);
        }
        for (uint256 i = 0; i < allDefaultCollectionTypes.length; i += 1) {
            (address assetAddr, , ) = IDava(dava()).getDefaultAsset(
                allDefaultCollectionTypes[i]
            );
            assets[i + allTypes.length] = Asset(
                allDefaultCollectionTypes[i],
                assetAddr,
                0
            );
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

    function _putOn(Asset memory asset_) internal {
        require(
            IDava(dava()).isDavaAsset(asset_.assetAddr, asset_.assetType),
            "Avatar: not a registered asset."
        );
        require(_isEligible(asset_), "Avatar: does not have the asset.");
        bytes32 assetType = asset_.assetType;
        _props().assets[assetType] = asset_;
        emit PutOn(assetType, asset_.assetAddr, asset_.id);
    }

    function _takeOff(bytes32 assetType) internal {
        Asset memory target = _props().assets[assetType];
        require(target.assetAddr != address(0), "Avatar: nothing to take off");
        delete _props().assets[assetType];
        emit TakeOff(assetType, target.assetAddr, target.id);
    }

    function _isEligible(Asset memory asset_)
        internal
        view
        virtual
        returns (bool)
    {
        require(
            IERC1155Collection(asset_.assetAddr).assetType(asset_.id) ==
                asset_.assetType,
            "AvatarBase: invalid assetType"
        );
        return (IERC1155(asset_.assetAddr).balanceOf(address(this), asset_.id) >
            0);
    }
}
