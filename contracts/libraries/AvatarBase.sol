//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

import {StorageSlot} from "@openzeppelin/contracts/utils/StorageSlot.sol";
import {IERC1155} from "@openzeppelin/contracts/interfaces/IERC1155.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Account} from "./Account.sol";
import {MinimalProxy} from "./MinimalProxy.sol";
import {IAsset} from "../interfaces/IAsset.sol";
import {IAccount} from "../interfaces/IAccount.sol";
import {IAvatar, Asset} from "../interfaces/IAvatar.sol";
import {IDava} from "../interfaces/IDava.sol";

abstract contract AvatarBase is MinimalProxy, Account, IAvatar {
    using Strings for uint256;

    event PutOn(bytes32 indexed assetType, address asset, uint256 id);
    event TakeOff(bytes32 indexed assetType, address asset, uint256 id);

    // DO NOT DECLARE state variables in the proxy contract.
    // If you wanna access to the existing state variables, use _props().
    // If you want to add new variables, design a new struct and allocate a slot for it.

    function setName(string memory name_) public virtual override onlyOwner {
        _props().name = name_;
    }

    function putOn(Asset[] calldata assets)
        external
        virtual
        override
        onlyOwner
    {
        for (uint256 i = 0; i < assets.length; i += 1) {
            _putOn(assets[i]);
        }
    }

    function takeOff(bytes32[] calldata assetTypes)
        external
        virtual
        override
        onlyOwner
    {
        for (uint256 i = 0; i < assetTypes.length; i += 1) {
            _takeOff(assetTypes[i]);
        }
    }

    function _putOn(Asset memory asset_) private {
        require(
            IDava(dava()).isDavaAsset(asset_.assetAddr),
            "Avatar: not a registered asset."
        );
        require(
            IERC1155(asset_.assetAddr).balanceOf(address(this), asset_.id) > 0,
            "Avatar: does not have the asset."
        );
        bytes32 assetType = IAsset(asset_.assetAddr).assetType();
        _props().assets[assetType] = asset_;
        emit PutOn(assetType, asset_.assetAddr, asset_.id);
    }

    function _takeOff(bytes32 assetType) private {
        Asset memory target = _props().assets[assetType];
        require(target.assetAddr != address(0), "Avatar: nothing to take off");
        emit TakeOff(assetType, target.assetAddr, target.id);
        delete _props().assets[assetType];
    }

    // add batchExecution()

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
        bool owning = IERC1155(asset_.assetAddr).balanceOf(
            address(this),
            asset_.id
        ) > 0;
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
        assets = new Asset[](allTypes.length);
        for (uint256 i = 0; i < assets.length; i += 1) {
            assets[i] = asset(allTypes[i]);
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
}
