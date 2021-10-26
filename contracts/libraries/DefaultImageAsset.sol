//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;

import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {IAsset, IERC165} from "../interfaces/IAsset.sol";

abstract contract DefaultImageAsset is IAsset, ERC165 {
    string private _defaultImage;

    constructor(string memory defaultImage_) {
        _defaultImage = defaultImage_;
    }

    function defaultImage() external view override returns (string memory) {
        return _defaultImage;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC165, IERC165)
        returns (bool)
    {
        return
            interfaceId == type(IAsset).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
