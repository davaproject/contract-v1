//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./roles/Operable.sol";
import "./interfaces/IAssetHouse.sol";

contract AssetHouse is IAssetHouse, Operable {
    string private constant NON_EMPTY_ASSET_LINK =
        "AssetHouse: asset link can not be empty";
    string private constant NON_EMPTY_TITLE =
        "AssetHouse: title can not be empty";
    string private constant NON_EXISTENT_ASSET =
        "AssetHouse: Non existent assetData";
    string private constant NON_EMPTY_CREATOR =
        "AssetHouse: Non empty creator address";

    string private constant svgStartLine =
        '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000">';
    string private constant svgEndLine = "</svg>";
    string private constant imgStartLine = '<image href="';
    string private constant imgEndLine = '" width="100%"/>';

    event NewAssetData(
        uint256 _id,
        string _assetHttpLink,
        string _title,
        address _creator,
        Trait[] _traits
    );

    uint256 public totalAssetData = 0;
    mapping(uint256 => AssetData) assetDataById;
    mapping(uint256 => Trait[]) traitsByAssetId;
    mapping(uint256 => bool) _exists;

    constructor() {
        addOperator(msg.sender);
    }

    function createAssetData(
        string calldata _assetHttpLink,
        string calldata _title,
        address _creator,
        Trait[] calldata _traits
    ) external onlyOperator returns (uint256 assetDataId) {
        require(bytes(_assetHttpLink).length > 0, NON_EMPTY_ASSET_LINK);
        require(bytes(_title).length > 0, NON_EMPTY_TITLE);
        require(_creator != address(0), NON_EMPTY_CREATOR);

        assetDataId = totalAssetData;

        AssetData memory assetData = AssetData({
            creator: _creator,
            assetHttpLink: _assetHttpLink,
            title: _title
        });

        uint256 traitsAmount = _traits.length;
        for (uint256 i = 0; i < traitsAmount; i += 1) {
            traitsByAssetId[assetDataId].push(_traits[i]);
        }

        assetDataById[assetDataId] = assetData;
        _exists[assetDataId] = true;

        emit NewAssetData(
            assetDataId,
            _assetHttpLink,
            _title,
            _creator,
            _traits
        );
        totalAssetData += 1;
    }

    function getAssetDataById(uint256 _id)
        external
        view
        override
        returns (AssetData memory assetData)
    {
        require(exists(_id), NON_EXISTENT_ASSET);
        assetData = assetDataById[_id];
    }

    function getTraitsById(uint256 _id)
        external
        view
        override
        returns (Trait[] memory traits)
    {
        require(exists(_id), NON_EXISTENT_ASSET);
        traits = traitsByAssetId[_id];
    }

    function getImageFromLink(string memory _assetHttpLink)
        public
        pure
        override
        returns (string memory)
    {
        return
            string(abi.encodePacked(imgStartLine, _assetHttpLink, imgEndLine));
    }

    function getSVGFromLinks(string[] memory _assetHttpLinks)
        public
        pure
        override
        returns (string memory svg)
    {
        string memory accumulator;

        for (uint256 i = 0; i < _assetHttpLinks.length; i += 1) {
            accumulator = string(
                abi.encodePacked(
                    accumulator,
                    getImageFromLink(_assetHttpLinks[i])
                )
            );
        }

        return string(abi.encodePacked(svgStartLine, accumulator, svgEndLine));
    }

    function getSVGWithChildSVGs(string[] memory _childSVGs)
        public
        pure
        override
        returns (string memory svg)
    {
        bytes memory accumulator;

        for (uint256 i = 0; i < _childSVGs.length; i += 1) {
            accumulator = abi.encodePacked(accumulator, _childSVGs[i]);
        }

        return string(abi.encodePacked(svgStartLine, accumulator, svgEndLine));
    }

    function exists(uint256 _id) public view override returns (bool) {
        return _exists[_id];
    }
}
