//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IAssetHouse {
    struct Trait {
        string traitType;
        string value;
    }

    struct AssetData {
        string assetHttpLink;
        string title;
        address creator;
    }

    function getAssetDataById(uint256 _id)
        external
        view
        returns (AssetData memory);

    function getTraitsById(uint256 _id) external view returns (Trait[] memory);

    function getImageFromLink(string memory _assetHttpLink)
        external
        pure
        returns (string memory);

    function getSVGFromLinks(string[] memory _assetHttpLinks)
        external
        pure
        returns (string memory svg);

    function getSVGWithChildSVGs(string[] memory _svgs)
        external
        pure
        returns (string memory svg);

    function exists(uint256 _id) external view returns (bool);
}
