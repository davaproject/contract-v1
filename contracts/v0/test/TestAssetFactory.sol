//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../Asset.sol";

contract TestAsset is Asset {
    constructor(
        string memory _name,
        string memory _symbol,
        string memory _traitType,
        ILayerHouse _layerHouse,
        IRandomBox _randomBox,
        IAssetHouse _assetHouse,
        address _avatar
    )
        Asset(
            _name,
            _symbol,
            _traitType,
            _layerHouse,
            _randomBox,
            _assetHouse,
            _avatar
        )
    {}

    function isApprovedOrOwner(address _spender, uint256 _tokenId)
        public
        view
        returns (bool)
    {
        return super._isApprovedOrOwner(_spender, _tokenId);
    }
}
