//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;

import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {IERC165} from "@openzeppelin/contracts/interfaces/IERC165.sol";
import {IFrameCollection} from "../interfaces/IFrameCollection.sol";
import {IPartCollection} from "../interfaces/IPartCollection.sol";
import {IWearable} from "../interfaces/IWearable.sol";

abstract contract Wearable is IWearable {
    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.Bytes32Set;

    address public override frameCollection;

    EnumerableSet.AddressSet private _registeredCollections;
    EnumerableSet.Bytes32Set private _supportedCategories;

    function isRegisteredCollection(address collection)
        public
        view
        override
        returns (bool)
    {
        return _registeredCollections.contains(collection);
    }

    function isSupportedCategory(bytes32 categoryId)
        public
        view
        override
        returns (bool)
    {
        return _supportedCategories.contains(categoryId);
    }

    function isDavaPart(address collection, bytes32 categoryId)
        public
        view
        override
        returns (bool)
    {
        return
            _registeredCollections.contains(collection) &&
            _supportedCategories.contains(categoryId);
    }

    function getAllSupportedCategories()
        public
        view
        override
        returns (bytes32[] memory categoryIds)
    {
        return _supportedCategories.values();
    }

    function getRegisteredCollections()
        public
        view
        override
        returns (address[] memory)
    {
        return _registeredCollections.values();
    }

    function _registerCollection(address collection) internal virtual {
        require(
            IERC165(collection).supportsInterface(
                type(IPartCollection).interfaceId
            ),
            "Wearable: invalid collection"
        );
        require(
            !_registeredCollections.contains(collection),
            "Wearable: already registered collection"
        );
        _registeredCollections.add(collection);

        emit CollectionRegistered(collection);
    }

    function _registerCategory(bytes32 categoryId) internal virtual {
        require(
            !_supportedCategories.contains(categoryId),
            "Wearable: category is already registered"
        );
        _supportedCategories.add(categoryId);

        emit CategoryRegistered(categoryId);
    }

    function _registerFrameCollection(address collection) internal virtual {
        require(
            IERC165(collection).supportsInterface(
                type(IFrameCollection).interfaceId
            ),
            "Dava: invalid collection"
        );

        frameCollection = collection;

        emit DefaultCollectionRegistered(collection);
    }

    function _deregisterCollection(address collection) internal virtual {
        require(
            _registeredCollections.contains(collection),
            "Dava: Non-registered collection"
        );

        _registeredCollections.remove(collection);

        emit CollectionDeregistered(collection);
    }

    function _deregisterCategory(bytes32 categoryId) internal virtual {
        require(
            _supportedCategories.contains(categoryId),
            "Dava: Non-registered category"
        );
        _supportedCategories.remove(categoryId);

        emit CategoryDeregistered(categoryId);
    }
}
