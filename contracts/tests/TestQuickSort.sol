//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;

import {QuickSort} from "../libraries/QuickSort.sol";

contract TestQuickSort {
    function sort(
        QuickSort.Layer[] memory arr,
        int256 left,
        int256 right
    ) external pure returns (QuickSort.Layer[] memory result) {
        QuickSort.sort(arr, left, right);
        return arr;
    }
}
