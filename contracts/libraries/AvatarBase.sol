//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {StorageSlot} from "@openzeppelin/contracts/utils/StorageSlot.sol";
import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {IERC721} from "@openzeppelin/contracts/interfaces/IERC721.sol";
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

abstract contract AvatarBase is
    BeaconProxy,
    ERC165,
    Initializable,
    Account,
    IAvatar
{
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

    function putOn(address assetAddr, uint256 id)
        public
        virtual
        override
        onlyOwner
    {
        require(
            IDava(dava()).isDavaAsset(assetAddr),
            "Avatar: not a registered asset."
        );
        require(
            IERC721(assetAddr).ownerOf(id) == address(this),
            "Avatar: not an owner."
        );
        bytes32 assetType = IAsset(assetAddr).assetType();
        _props().assets[assetType] = Asset(assetAddr, id);
        emit PutOn(assetType, assetAddr, id);
    }

    function takeOff(bytes32 assetType) public virtual override {
        Asset memory target = _props().assets[assetType];
        require(
            msg.sender == owner() || msg.sender == target.assetAddr,
            "Avatar: not permitted."
        );
        require(target.assetAddr != address(0), "Avatar: nothing to take off");
        emit TakeOff(assetType, target.assetAddr, target.id);
        delete _props().assets[assetType];
    }

    function name() public view virtual override returns (string memory) {
        return _props().name;
    }

    function version() public pure virtual override returns (string memory);

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
        returns (address, uint256)
    {
        Asset memory asset_ = _props().assets[assetType];
        return (asset_.assetAddr, asset_.id);
    }

    function allAssets() public view virtual override returns (Asset[] memory assets) {
        bytes32[] memory allAssetTypes = IDava(dava())
            .getAllSupportedAssetTypes();
        assets = new Asset[](allAssetTypes.length);
        for (uint256 i = 0; i < assets.length; i += 1) {
            (address assetAddr, uint256 id) = asset(allAssetTypes[i]);
            assets[i] = Asset(assetAddr, id);
        }
    }

    function getPFP() external view virtual override returns (string memory);

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override
        returns (bool)
    {
        return
            interfaceId == type(IAvatar).interfaceId ||
            interfaceId == type(IAccount).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function _props() internal pure virtual returns (Props storage r) {
        bytes32 slot = PROPS_SLOT;
        assembly {
            r.slot := slot
        }
    }
}
