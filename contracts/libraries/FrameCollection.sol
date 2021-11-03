//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;

import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {IERC165} from "@openzeppelin/contracts/interfaces/IERC165.sol";
import {IFrameCollection} from "../interfaces/IFrameCollection.sol";

abstract contract FrameCollection is AccessControl, IFrameCollection {
    using EnumerableSet for EnumerableSet.UintSet;

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // frameId => Frame
    mapping(uint256 => Frame) private _frameOf;

    EnumerableSet.UintSet private _frameIds;
    uint256 private _nextFrameId = 0;

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(OPERATOR_ROLE, msg.sender);
        _setRoleAdmin(OPERATOR_ROLE, DEFAULT_ADMIN_ROLE);
    }

    function registerFrame(string calldata imgUri_, uint256 zIndex_)
        external
        onlyRole(OPERATOR_ROLE)
    {
        _frameOf[_nextFrameId] = Frame(_nextFrameId, imgUri_, zIndex_);
        _frameIds.add(_nextFrameId);
        _nextFrameId += 1;
    }

    function removeFrame(uint256 frameId_) external onlyRole(OPERATOR_ROLE) {
        require(
            _frameIds.contains(frameId_),
            "FrameCollection: Unregistered frame"
        );
        _frameIds.remove(frameId_);
        delete _frameOf[frameId_];
    }

    function frameOf(uint256 frameId_)
        external
        view
        override
        returns (Frame memory)
    {
        return _frameOf[frameId_];
    }

    function getAllFrames() external view override returns (Frame[] memory) {
        uint256 amountOfFrames = _frameIds.length();
        Frame[] memory frames = new Frame[](amountOfFrames);

        for (uint256 i = 0; i < amountOfFrames; i += 1) {
            uint256 frameId = _frameIds.at(i);
            frames[i] = _frameOf[frameId];
        }

        return frames;
    }

    function totalFrames() external view override returns (uint256) {
        return _frameIds.length();
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(AccessControl, IERC165)
        returns (bool)
    {
        return
            interfaceId == type(IFrameCollection).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}