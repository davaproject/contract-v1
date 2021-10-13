//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/ILayerHouse.sol";
import "./interfaces/IAssetHouse.sol";
import "./roles/Operable.sol";

contract LayerHouse is ILayerHouse, Operable {
    string private constant NON_EMPTY_ADDRESS =
        "LayerHouse: address should not be empty";
    string private constant NON_EXISTENT_ASSET =
        "LayerHouse: Asset does not exist";
    string private constant NON_EXISTENT_LAYER =
        "LayerHouse: Non existent layer";
    string private constant LAYER_ALREADY_REGISTERED =
        "LayerHouse: layers are already registered";

    uint256 public totalLayers;

    IAssetHouse public assetHouse;

    // index => layer (index should be greater than 0)
    mapping(uint256 => Layer) public layerByIndex;

    // contractAddress => zIndex => layerIndex
    mapping(address => mapping(uint256 => uint256))
        public layerIndexByAddressAndZIndex;

    mapping(address => uint256) public override layerAmountOf;

    event SetAssetHouse(IAssetHouse _assetHouse);
    event RegisterLayer(
        address indexed _address,
        bool _hasDefault,
        uint256 _assetId,
        uint256 _index
    );
    event RegisterLayersToAddress(
        address indexed _address,
        uint256[] _indexList
    );
    event ResetLayersFromAddress(address indexed _address);

    constructor(IAssetHouse _assetHouse) {
        assetHouse = _assetHouse;
        addOperator(msg.sender);
    }

    function setAssetHouse(IAssetHouse _assetHouse) external onlyOwner {
        require(address(_assetHouse) != address(0), NON_EMPTY_ADDRESS);
        assetHouse = _assetHouse;

        emit SetAssetHouse(_assetHouse);
    }

    function _registerLayer(Layer memory _layer) private {
        require(
            _layer.asset != address(0) || _layer.hasDefault,
            NON_EMPTY_ADDRESS
        );
        if (_layer.hasDefault) {
            require(assetHouse.exists(_layer.assetId), NON_EXISTENT_ASSET);
        }

        totalLayers += 1;
        layerByIndex[totalLayers] = _layer;

        emit RegisterLayer(
            _layer.asset,
            _layer.hasDefault,
            _layer.assetId,
            totalLayers
        );
    }

    function registerLayers(Layer[] calldata _layers) external onlyOperator {
        for (uint256 i = 0; i < _layers.length; i += 1) {
            _registerLayer(_layers[i]);
        }
    }

    function registerLayersToAddress(
        address _targetAddress,
        uint256[] calldata _indexList
    ) external onlyOperator {
        require(layerAmountOf[_targetAddress] == 0, LAYER_ALREADY_REGISTERED);

        for (uint256 i = 0; i < _indexList.length; i += 1) {
            uint256 index = _indexList[i];
            require(
                layerByIndex[index].asset != address(0) ||
                    layerByIndex[index].hasDefault,
                NON_EXISTENT_LAYER
            );

            layerIndexByAddressAndZIndex[_targetAddress][i] = index;
        }
        layerAmountOf[_targetAddress] = _indexList.length;
        emit RegisterLayersToAddress(_targetAddress, _indexList);
    }

    function resetLayersFromAddress(address _targetAddress)
        external
        onlyOperator
    {
        uint256 layerAmount = layerAmountOf[_targetAddress];
        for (uint256 i = 0; i < layerAmount; i += 1) {
            delete layerIndexByAddressAndZIndex[_targetAddress][i];
        }
        layerAmountOf[_targetAddress] = 0;
        emit ResetLayersFromAddress(_targetAddress);
    }

    // Extremely dangerous to use this function on-chain.
    // It can consume a lot of gas if there are too many layers in it.
    function layersOf(address _targetAddress)
        external
        view
        override
        returns (Layer[] memory)
    {
        uint256 layerAmount = layerAmountOf[_targetAddress];
        Layer[] memory layers = new Layer[](layerAmount);

        for (uint256 i = 0; i < layerAmount; i += 1) {
            uint256 index = layerIndexByAddressAndZIndex[_targetAddress][i];
            layers[i] = layerByIndex[index];
        }

        return layers;
    }
}
