//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

import "@openzeppelin/contracts/utils/Strings.sol";
import "../interfaces/IAsset.sol";
import "../libraries/AvatarBase.sol";
import "../libraries/OnchainMetadata.sol";

contract AvatarV1 is AvatarBase {
    using Strings for uint256;
    using OnchainMetadata for OnchainMetadata.OnchainSVG[];

    function version() public pure override returns (string memory) {
        return "V1";
    }

    function getPFP() external view override returns (string memory) {
        Asset[] memory assets = allAssets();
        string[] memory svgs = new string[](assets.length);
        // OnchainMetadata.OnchainSVG[]
        //     memory onchainSVGs = new OnchainMetadata.OnchainSVG[](
        //         assets.length
        //     );
        for (uint256 i = 0; i < assets.length; i += 1) {
            svgs[i] = IAsset(assets[i].assetAddr).image(assets[i].id);
            // onchainSVGs[i].svg = IAsset(assets[i].assetAddr).image(
            //     assets[i].id
            // );
            // onchainSVGs[i].zIndex = IAsset(assets[i].assetAddr).zIndex();
        }
        // return onchainSVGs.compileImages();
        return OnchainMetadata.compileImages(svgs);
    }
}
