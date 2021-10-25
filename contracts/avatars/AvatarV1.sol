//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

import "@openzeppelin/contracts/utils/Strings.sol";
import "../interfaces/IAsset.sol";
import "../libraries/AvatarBase.sol";
import "../libraries/OnchainMetadata.sol";

// TODO: ipfs router contract
contract AvatarV1 is AvatarBase {
    using Strings for uint256;

    struct Layer {
        string imgUri;
        uint256 zIndex;
    }

    function version() public pure override returns (string memory) {
        return "V1";
    }

    function getPFP() external view override returns (string memory) {
        Asset[] memory assets = allAssets();
        Layer[] memory layers = new Layer[](assets.length);

        for (uint256 i = 0; i < assets.length; i += 1) {
            string memory image = IAsset(assets[i].assetAddr).image(
                assets[i].id
            );
            uint256 zIndex = IAsset(assets[i].assetAddr).zIndex();

            layers[i] = Layer(image, zIndex);
        }

        quickSort(layers, int256(0), int256(assets.length - 1));

        string[] memory imgURIs = new string[](assets.length);
        for (uint256 i = 0; i < assets.length; i += 1) {
            imgURIs[i] = layers[i].imgUri;
        }

        return OnchainMetadata.compileImages(imgURIs);
    }

    /// @notice basic quickSort function from https://gist.github.com/subhodi/b3b86cc13ad2636420963e692a4d896f#file-quicksort-sol
    function quickSort(
        Layer[] memory arr,
        int256 left,
        int256 right
    ) private pure {
        int256 i = left;
        int256 j = right;
        if (i == j) return;
        uint256 pivot = arr[uint256(left + (right - left) / 2)].zIndex;
        while (i <= j) {
            while (arr[uint256(i)].zIndex < pivot) i += 1;
            while (pivot < arr[uint256(j)].zIndex) j -= 1;
            if (i <= j) {
                (arr[uint256(i)], arr[uint256(j)]) = (
                    arr[uint256(j)],
                    arr[uint256(i)]
                );
                i += 1;
                j += 1;
            }
        }
        if (left < j) quickSort(arr, left, j);
        if (i < right) quickSort(arr, i, right);
    }
}
