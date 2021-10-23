//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./roles/Operable.sol";
import "./libs/LibBase64.sol";
import "./libs/LibAddress.sol";
import "./interfaces/IAssetHouse.sol";
import "./interfaces/IRandomBox.sol";
import "./interfaces/IAsset.sol";
import "./interfaces/ILayerHouse.sol";

contract Asset is ERC721Enumerable, Operable, IAsset {
    using LibAddress for address;

    string private constant NON_EXISTENT_INDEX = "Asset: index does not exist";
    string private constant NON_EXISTENT_TOKEN = "Asset: token does not exist";
    string private constant NON_EXISTENT_ASSET = "Asset: Asset does not exist";
    string private constant NO_EMPTY_ADDRESS =
        "Asset: address should not be empty";
    string private constant ONLY_POS_NUMBER =
        "Asset: max supply should be greater than 0";
    string private constant ALREADY_REGISTERED_ASSET =
        "Asset: asset is already registered";
    string private constant EXCEEDS_TOKEN_MAX_SUPPLY =
        "Asset: token supply is full";
    string private constant EXCEEDS_ASSET_MAX_SUPPLY =
        "Asset: Asset supply is full";
    string private constant INVALID_LAYER = "Asset: Invalid layer";
    string private constant EXCEEDS_MAX_ASSET_SUPPLY_LIMIT =
        "Asset: Can not register asset amount more than maxAssetSupply";

    using Strings for uint256;
    using LibBase64 for bytes;

    string public override traitType;

    address public avatarFactory;
    ILayerHouse public layerHouse;
    IRandomBox public randomBox;
    IAssetHouse public assetHouse;

    uint256 public maxTotalSupply;

    // Make asset not be able to take all spots in maxTotalSupply
    uint256 public constant maxAssetSupply = 10000;

    // Rarity allocation
    mapping(uint256 => uint256) private _assetIdByIndex;
    mapping(uint256 => uint256) public maxSupplyByAssetId;
    mapping(uint256 => uint256) public totalSupplyByAssetId;
    mapping(uint256 => uint256) private _assetIdByTokenId;
    mapping(uint256 => uint256[]) private _tokenIdsByAssetId;
    uint256[] private assets;

    event RegisterAsset(uint256 _index, uint256 _assetId, uint256 _maxSupply);
    event Mint(address indexed _receiver, uint256 _tokenId, uint256 _assetId);
    event MintWithAssetId(
        address indexed _receiver,
        uint256 _tokenId,
        uint256 _assetId
    );
    event SetLayerHouse(address _layerHouse);

    constructor(
        string memory _name,
        string memory _symbol,
        string memory _traitType,
        ILayerHouse _layerHouse,
        IRandomBox _randomBox,
        IAssetHouse _assetHouse,
        address _avatarFactory
    ) ERC721(_name, _symbol) {
        traitType = _traitType;
        layerHouse = _layerHouse;
        randomBox = _randomBox;
        assetHouse = _assetHouse;
        addOperator(msg.sender);

        avatarFactory = _avatarFactory;
    }

    function totalAssets() public view returns (uint256) {
        return assets.length;
    }

    function assetIdByIndex(uint256 _index) public view returns (uint256) {
        require(_index < totalAssets(), NON_EXISTENT_INDEX);
        return _assetIdByIndex[_index];
    }

    function assetIdByTokenId(uint256 _tokenId) public view returns (uint256) {
        require(_exists(_tokenId), NON_EXISTENT_TOKEN);
        return _assetIdByTokenId[_tokenId];
    }

    function tokenIdsByAssetId(uint256 _assetId)
        public
        view
        returns (uint256[] memory)
    {
        return _tokenIdsByAssetId[_assetId];
    }

    function tokenAmountByAssetId(uint256 _assetId)
        public
        view
        returns (uint256)
    {
        return _tokenIdsByAssetId[_assetId].length;
    }

    function setLayerHouse(ILayerHouse _layerHouse) external onlyOwner {
        require(address(_layerHouse) != address(0), NO_EMPTY_ADDRESS);
        layerHouse = _layerHouse;

        emit SetLayerHouse(address(_layerHouse));
    }

    function registerAsset(uint256 _assetId, uint256 _maxSupply)
        external
        onlyOperator
    {
        require(_maxSupply > 0, ONLY_POS_NUMBER);
        require(_maxSupply <= maxAssetSupply, EXCEEDS_MAX_ASSET_SUPPLY_LIMIT);
        require(maxSupplyByAssetId[_assetId] == 0, ALREADY_REGISTERED_ASSET);
        require(assetHouse.exists(_assetId), NON_EXISTENT_ASSET);

        uint256 index = totalAssets();
        maxTotalSupply += _maxSupply;
        maxSupplyByAssetId[_assetId] = _maxSupply;
        _assetIdByIndex[index] = _assetId;
        assets.push(_assetId);

        emit RegisterAsset(index, _assetId, _maxSupply);
    }

    function getAssets() external view returns (uint256[] memory) {
        return assets;
    }

    function randomMint(address _to)
        external
        override
        onlyOperator
        returns (uint256 tokenId)
    {
        tokenId = totalSupply();
        require(tokenId < maxTotalSupply, EXCEEDS_TOKEN_MAX_SUPPLY);

        uint256 assetSlots = totalAssets();
        uint256 randomNumber = randomBox.getRandomNumber(assetSlots);
        uint256 assetId;

        for (uint256 i = 0; i < assetSlots; i += 1) {
            uint256 index = (randomNumber + i) % assetSlots;
            assetId = assetIdByIndex(index);

            if (totalSupplyByAssetId[assetId] < maxSupplyByAssetId[assetId]) {
                break;
            }
        }

        totalSupplyByAssetId[assetId] += 1;
        _assetIdByTokenId[tokenId] = assetId;
        _tokenIdsByAssetId[assetId].push(tokenId);

        _safeMint(_to, tokenId);

        emit Mint(_to, tokenId, assetId);
    }

    function mintWithAssetId(address _to, uint256 _assetId)
        external
        onlyOperator
        returns (uint256 tokenId)
    {
        tokenId = totalSupply();
        require(tokenId < maxTotalSupply, EXCEEDS_TOKEN_MAX_SUPPLY);

        require(
            totalSupplyByAssetId[_assetId] < maxSupplyByAssetId[_assetId],
            EXCEEDS_ASSET_MAX_SUPPLY
        );

        totalSupplyByAssetId[_assetId] += 1;
        _assetIdByTokenId[tokenId] = _assetId;
        _tokenIdsByAssetId[_assetId].push(tokenId);

        _safeMint(_to, tokenId);

        emit MintWithAssetId(_to, tokenId, _assetId);
    }

    function getImageForDisplay(uint256 _tokenId)
        public
        view
        returns (string memory svg)
    {
        require(_exists(_tokenId), NON_EXISTENT_TOKEN);
        uint256 layerAmount = layerHouse.layerAmountOf(address(this));

        ILayerHouse.Layer[] memory layers = layerHouse.layersOf(address(this));
        string[] memory assetHttpLinks = new string[](layerAmount);

        for (uint256 i = 0; i < layerAmount; i += 1) {
            ILayerHouse.Layer memory layer = layers[i];

            require(
                layer.hasDefault || layer.asset == address(this),
                INVALID_LAYER
            );

            if (layer.hasDefault) {
                assetHttpLinks[i] = assetHouse
                    .getAssetDataById(layer.assetId)
                    .assetHttpLink;
            } else {
                assetHttpLinks[i] = assetHouse
                    .getAssetDataById(assetIdByTokenId(_tokenId))
                    .assetHttpLink;
            }
        }

        return assetHouse.getSVGFromLinks(assetHttpLinks);
    }

    function getRawImage(uint256 _tokenId)
        external
        view
        override
        returns (string memory)
    {
        require(_exists(_tokenId), NON_EXISTENT_TOKEN);

        return assetHouse.getImageFromLink(assetHttpLink(_tokenId));
    }

    function _getAssetByTokenId(uint256 _tokenId)
        private
        view
        returns (IAssetHouse.AssetData memory)
    {
        require(_exists(_tokenId), NON_EXISTENT_TOKEN);

        IAssetHouse.AssetData memory assetData = assetHouse.getAssetDataById(
            _assetIdByTokenId[_tokenId]
        );

        return assetData;
    }

    function assetHttpLink(uint256 _tokenId)
        public
        view
        override
        returns (string memory)
    {
        return _getAssetByTokenId(_tokenId).assetHttpLink;
    }

    function assetTitle(uint256 _tokenId)
        public
        view
        override
        returns (string memory)
    {
        return _getAssetByTokenId(_tokenId).title;
    }

    function assetCreator(uint256 _tokenId)
        public
        view
        override
        returns (address)
    {
        return _getAssetByTokenId(_tokenId).creator;
    }

    function assetTraits(uint256 _tokenId)
        public
        view
        override
        returns (IAssetHouse.Trait[] memory)
    {
        require(_exists(_tokenId), NON_EXISTENT_TOKEN);

        IAssetHouse.Trait[] memory traits = assetHouse.getTraitsById(
            _assetIdByTokenId[_tokenId]
        );

        return traits;
    }

    function tokenURI(uint256 _tokenId)
        public
        view
        override
        returns (string memory)
    {
        require(_exists(_tokenId), NON_EXISTENT_TOKEN);

        bytes memory metadata = abi.encodePacked(
            '{"name":"',
            name(),
            " #",
            _tokenId.toString(),
            '","creator":"',
            assetCreator(_tokenId).toString(),
            '","attributes":[{"trait_type":"',
            traitType,
            '","value":"',
            assetTitle(_tokenId)
        );

        IAssetHouse.Trait[] memory traits = assetTraits(_tokenId);
        uint256 traitsAmount = traits.length;

        for (uint256 i = 0; i < traitsAmount; i += 1) {
            IAssetHouse.Trait memory trait = traits[i];
            metadata = abi.encodePacked(
                metadata,
                '"},{"trait_type":"',
                trait.traitType,
                '","value":"',
                trait.value
            );
        }

        metadata = abi.encodePacked(
            metadata,
            '"}],"image":"data:image/svg_xml;base64,',
            abi.encodePacked(getImageForDisplay(_tokenId)).encode(),
            '"}'
        );

        return string(metadata);
    }

    function _isApprovedOrOwner(address _spender, uint256 _tokenId)
        internal
        view
        override
        returns (bool)
    {
        return
            super._isApprovedOrOwner(_spender, _tokenId) ||
            avatarFactory == msg.sender;
    }
}
