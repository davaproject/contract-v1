//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../Avatar.sol";

contract TestAvatar is Avatar {
    constructor(
        uint256 _maxSupply,
        ILayerHouse _layerHouse,
        IAssetHouse _assetHouse
    ) Avatar(_layerHouse, _assetHouse) {
        MAX_SUPPLY = _maxSupply;
    }

    function registerAssetContract(address _assetContract) public {
        super._registerAssetContract(_assetContract);
    }

    function removeChild(
        uint256 _avatarId,
        address _childContract,
        uint256 _childTokenId
    ) public {
        _removeChild(_avatarId, _childContract, _childTokenId);
    }

    function receiveChild(
        address _from,
        uint256 _avatarId,
        address _childContract,
        uint256 _childTokenId
    ) public {
        _receiveChild(_from, _avatarId, _childContract, _childTokenId);
    }

    function checkTransferChild(
        uint256 _avatarId,
        address _to,
        address _childContract,
        uint256 _childTokenId
    ) public view {
        return
            _checkTransferChild(_avatarId, _to, _childContract, _childTokenId);
    }
}
