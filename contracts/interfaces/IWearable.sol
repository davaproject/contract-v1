//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;

interface IWearable {
    event CollectionRegistered(address collection);

    event CollectionDeregistered(address collection);

    event DefaultCollectionRegistered(address collection);

    event CategoryRegistered(bytes32 categoryId);

    event CategoryDeregistered(bytes32 categoryId);

    function frameCollection() external view returns (address);

    function isRegisteredCollection(address collection)
        external
        view
        returns (bool);

    function isSupportedCategory(bytes32 categoryId)
        external
        view
        returns (bool);

    function isDavaPart(address collection, bytes32 categoryId)
        external
        view
        returns (bool);

    function getAllSupportedCategories()
        external
        view
        returns (bytes32[] memory categoryIds);

    function getRegisteredCollections()
        external
        view
        returns (address[] memory);
}
