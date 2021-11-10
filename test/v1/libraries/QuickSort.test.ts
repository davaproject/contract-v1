import chai from "chai";

import { ethers } from "hardhat";
import { TestQuickSort, TestQuickSort__factory } from "../../../types";
import { solidity } from "ethereum-waffle";

chai.use(solidity);
const { expect } = chai;

describe("QuickSort", () => {
  let quickSort: TestQuickSort;

  before(async () => {
    const [deployer] = await ethers.getSigners();
    const quickSortTestContract = new TestQuickSort__factory(deployer);
    quickSort = await quickSortTestContract.deploy();
    await quickSort.deployed();
  });

  describe("sort", () => {
    const array = [
      { value: 3, index: 3 },
      { value: 2, index: 2 },
      { value: 1, index: 1 },
    ];

    describe("should be reverted", () => {
      it("if left argument is less than 0", async () => {
        await expect(quickSort.sort(array, -1, array.length - 1)).to.be
          .reverted;
      });

      it("if length of array is less than the gap between left and right", async () => {
        await expect(quickSort.sort(array, 0, array.length)).to.be.reverted;
      });
    });

    describe("return sorted result", () => {
      it("if gap is less than array", async () => {
        const result = await quickSort.sort(array, 0, 1);
        expect(result[0].value.toNumber()).to.equal(array[1].value);
        expect(result[1].value.toNumber()).to.equal(array[0].value);
        expect(result[2].value.toNumber()).to.equal(array[2].value);
      });

      it("if gap is equal to array", async () => {
        const result = await quickSort.sort(array, 0, 2);
        expect(result[0].value.toNumber()).to.equal(array[2].value);
        expect(result[1].value.toNumber()).to.equal(array[1].value);
        expect(result[2].value.toNumber()).to.equal(array[0].value);
      });
    });
  });
});
