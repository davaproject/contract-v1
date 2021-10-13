//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "./interfaces/IAvatar.sol";
import "./interfaces/IAsset.sol";
import "./interfaces/IRandomBox.sol";

interface IERC721Enumerable {
    function totalSupply() external view returns (uint256);

    function maxTotalSupply() external view returns (uint256);
}

contract InitialSale is Ownable, ERC721Holder {
    string private constant ASSET_IS_EMPTY = "InitialSale: Asset list is empty";

    IAvatar public avatar;
    IRandomBox public randomBox;

    address[] public assetList;
    uint256 mintAmountPerAvatar = 3;

    event RegisterAssetList(address[] _assetList);
    event MintAvatarWithAssets(
        address _receiver,
        uint256 _avatarId,
        IAsset[] _childContractList
    );

    constructor(IAvatar _avatar, IRandomBox _randomBox) {
        avatar = _avatar;
        randomBox = _randomBox;
    }

    function registerAssetList(address[] calldata _assetList)
        external
        onlyOwner
    {
        assetList = _assetList;
        emit RegisterAssetList(_assetList);
    }

    // TODO: Make this production
    function mintAvatarWithAssets(address _receiver) external {
        uint256 avatarId = avatar.mint(_receiver);

        IAsset[] memory childContractList = new IAsset[](mintAmountPerAvatar);
        for (uint256 i = 0; i < mintAmountPerAvatar; i++) {
            IAsset assetContract = _getAssetContractRandomly();
            assetContract.randomMint(address(_receiver));

            childContractList[i] = assetContract;
        }

        emit MintAvatarWithAssets(_receiver, avatarId, childContractList);
    }

    function _getAssetContractRandomly()
        private
        returns (IAsset targetContract)
    {
        uint256 contractAmount = assetList.length;
        require(contractAmount > 0, ASSET_IS_EMPTY);

        uint256 randomIndex = randomBox.getRandomNumber(contractAmount);

        for (uint256 i = 0; i < contractAmount; i += 1) {
            address _targetContract = assetList[randomIndex];
            if (_isMintable(IERC721Enumerable(_targetContract))) {
                return IAsset(_targetContract);
            } else {
                randomIndex = (randomIndex + 1) % contractAmount;
            }
        }
        revert("Not enough asset is left");
    }

    function _isMintable(IERC721Enumerable _contract)
        private
        view
        returns (bool)
    {
        if (_contract.totalSupply() < _contract.maxTotalSupply()) {
            return true;
        } else {
            return false;
        }
    }
}
