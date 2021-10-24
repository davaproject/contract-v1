//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {StorageSlot} from "@openzeppelin/contracts/utils/StorageSlot.sol";
import {IERC1155} from "@openzeppelin/contracts/interfaces/IERC1155.sol";
import {Account} from "./Account.sol";
import {BeaconProxy} from "./BeaconProxy.sol";
import {IAsset} from "../interfaces/IAsset.sol";
import {IAccount} from "../interfaces/IAccount.sol";
import {IAvatar, Asset} from "../interfaces/IAvatar.sol";
import {IDava} from "../interfaces/IDava.sol";

struct Props {
    uint256 davaId;
    string name;
    mapping(bytes32 => Asset) assets; // TODO: Asset[] vs Asset
}

abstract contract AvatarBase is BeaconProxy, Initializable, Account, IAvatar {
    // For the slot allocation
    using StorageSlot for StorageSlot.AddressSlot;

    bytes32 private constant DAVA_CONTRACT_SLOT =
        bytes32(uint256(keccak256("dava.contract")) - 1);
    bytes32 private constant PROPS_SLOT =
        bytes32(uint256(keccak256("dava.props.v1")) - 1);

    event PutOn(bytes32 indexed assetType, address asset, uint256 id);
    event TakeOff(bytes32 indexed assetType, address asset, uint256 id);

    // Dummy constructor for compilation
    constructor() {}

    function initialize(uint256 davaId_) public override initializer {
        _upgradeBeaconToAndCall(_msgSender(), "", false);
        StorageSlot.getAddressSlot(DAVA_CONTRACT_SLOT).value = _msgSender();
        _props().davaId = davaId_;
    }

    function setName(string memory name_) public virtual override onlyOwner {
        _props().name = name_;
    }

    function putOn(Asset memory asset_) public virtual override onlyOwner {
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

    function takeOff(bytes32 assetType) public virtual override onlyOwner {
        Asset memory target = _props().assets[assetType];
        require(target.assetAddr != address(0), "Avatar: nothing to take off");
        emit TakeOff(assetType, target.assetAddr, target.id);
        delete _props().assets[assetType];
    }

    // add batchExecution()

    function name() public view virtual override returns (string memory) {
        return _props().name;
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
        // Check the balance
        bool owning = IERC1155(asset_.assetAddr).balanceOf(
            address(this),
            asset_.id
        ) > 0;
        // return the asset only when the Avatar owns the asset or return a null asset.
        if (owning) {
            return asset_;
        } else {
            return Asset(address(0), 0);
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

    function _props() internal pure virtual returns (Props storage r) {
        bytes32 slot = PROPS_SLOT;
        assembly {
            r.slot := slot
        }
    }
}
