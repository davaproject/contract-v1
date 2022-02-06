//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;

interface IERC721Freezable {
    event TransporterRegistered(address transporter);

    event TransporterDeregistered(address transporter);

    event Paused(address account);

    event Unpaused(address account);

    event Freeze(address requester, uint256 tokenId);

    event Unfreeze(address requester, uint256 tokenId);

    function freeze(uint256 tokenId) external;

    function unfreeze(uint256 tokenId) external;

    function isFrozen(uint256 tokenId) external view returns (bool);

    function paused() external view returns (bool);
}
