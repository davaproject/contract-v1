//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IRandomBox.sol";

interface IDava {
    function ownerOf(uint256 tokenId) external view returns (address);

    function getAvatar(uint256 id) external view returns (address);
}

interface IAsset {
    function maxSupply(uint256 id) external view returns (uint256);

    function totalSupply(uint256 id) external view returns (uint256);

    function numberOfAssets() external view returns (uint256);

    function maxTotalAssetSupply() external view returns (uint256);

    function totalAssetSupply() external view returns (uint256);

    function mint(
        address account,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) external;
}

contract AssetDrop is Ownable {
    uint256 constant DROP_AMOUNT_PER_AVATAR = 3;

    uint256 public openingTime = 2**256 - 1;

    mapping(uint256 => bool) public alreadyDropped;

    IDava public dava;
    IAsset[] private _assets;
    IRandomBox public randomBox;

    event SetOpeningTime(uint256 openingTime);
    event RequestAssets(uint256 indexed avatarId);

    constructor(
        IDava dava_,
        IAsset[] memory assets_,
        IRandomBox randomBox_
    ) {
        dava = dava_;
        _assets = assets_;
        randomBox = randomBox_;
    }

    modifier onlyDuringOpened() {
        require(block.timestamp >= openingTime, "AssetDrop: not opened");
        _;
    }

    function setOpeningTime(uint256 openingTime_) external onlyOwner {
        openingTime = openingTime_;
        emit SetOpeningTime(openingTime_);
    }

    function requestAssets(uint256 avatarId) external onlyDuringOpened {
        require(
            dava.ownerOf(avatarId) == msg.sender,
            "AssetDrop: not authorized"
        );
        require(
            !alreadyDropped[avatarId],
            "AssetDrop: already received airdrop"
        );

        alreadyDropped[avatarId] = true;

        (IAsset asset, uint256 assetId) = getRandomAsset();
        asset.mint(dava.getAvatar(avatarId), assetId, 1, "");

        emit RequestAssets(avatarId);
    }

    function getRandomAsset() private returns (IAsset, uint256) {
        uint256 randomIndex = randomBox.getRandomNumber(_assets.length);

        for (uint256 i = 0; i < _assets.length; i += 1) {
            IAsset asset = _assets[randomIndex];
            if (isMintable(asset)) {
                uint256 assetId = getRandomAssetId(asset);
                return (asset, assetId);
            } else {
                randomIndex = (randomIndex + 1) % _assets.length;
            }
        }

        revert("AssetDrop: asset drop event is closed");
    }

    function getRandomAssetId(IAsset asset) private returns (uint256) {
        uint256 numberOfAssets = asset.numberOfAssets();
        uint256 randomIndex = randomBox.getRandomNumber(numberOfAssets);

        for (uint256 i = 0; i < numberOfAssets; i += 1) {
            if (asset.totalSupply(randomIndex) < asset.maxSupply(randomIndex)) {
                return randomIndex;
            } else {
                randomIndex = (randomIndex + 1) % numberOfAssets;
            }
        }

        revert("AssetDrop: already filled asset contract");
    }

    function isMintable(IAsset asset_) private view returns (bool) {
        if (asset_.totalAssetSupply() < asset_.maxTotalAssetSupply()) {
            return true;
        } else {
            return false;
        }
    }
}
