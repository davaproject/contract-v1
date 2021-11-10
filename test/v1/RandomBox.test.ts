import chai from "chai";

import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { TestRandomBox, TestRandomBox__factory } from "../../types";
import { solidity } from "ethereum-waffle";
import { checkChange } from "./utils/compare";
import { BytesLike } from "@ethersproject/bytes";
import BytesLikeArray from "./types/BytesLikeArray";

chai.use(solidity);
const { expect } = chai;

describe("RandomBox", () => {
  let randomBox: TestRandomBox;
  let [deployer, ...accounts]: SignerWithAddress[] = [];

  before(async () => {
    [deployer, ...accounts] = await ethers.getSigners();
    const RandomBox = new TestRandomBox__factory(deployer);
    randomBox = await RandomBox.deploy();
    await randomBox.deployed();
  });

  describe("setSeed", () => {
    it("should be reverted for non-owner", async () => {
      await expect(randomBox.connect(accounts[5]).setSeed()).to.be.revertedWith(
        "RandomBox: only owner can run this"
      );
    });

    it("should set seed correctly", async () => {
      const nextBlockTimestamp = Math.floor(Date.now() / 1000) + 1000;
      await checkChange({
        process: async () => {
          await ethers.provider.send("evm_setNextBlockTimestamp", [
            nextBlockTimestamp,
          ]);
          await randomBox.setSeed();
        },
        status: () => randomBox.seed().then((v) => v.toNumber()),
        expectedBefore: 0,
        expectedAfter: nextBlockTimestamp,
      });
    });
  });

  describe("setPartIds", () => {
    it("should be reverted for non-owner", async () => {
      await expect(
        randomBox
          .connect(accounts[5])
          .setA(
            new Array(313).fill(
              "0x63616e6469646174653100000000000000000000000000000000000000000000"
            ) as BytesLikeArray
          )
      ).to.be.revertedWith("RandomBox: only owner can run this");
    });

    it("should set aPartIds correctly", async () => {
      const randomBytes = ethers.utils.randomBytes(32);

      await checkChange({
        process: () =>
          randomBox.setA(new Array(313).fill(randomBytes) as BytesLikeArray),
        status: () => randomBox.aPartIds(0),
        expectedBefore: ethers.utils.formatBytes32String(""),
        expectedAfter: ethers.utils.hexlify(randomBytes),
      });
    });
  });

  describe("getPartIds", () => {
    let randomBytes: BytesLikeArray;
    let seed: number;

    before(async () => {
      randomBytes = new Array(313)
        .fill(null)
        .map(() => ethers.utils.randomBytes(32) as BytesLike) as BytesLikeArray;
      seed = Math.floor(Date.now() / 1000) + 10000;
      await randomBox.setA(randomBytes as BytesLikeArray);
      await randomBox.setB(randomBytes as BytesLikeArray);
      await randomBox.setC(randomBytes as BytesLikeArray);

      await ethers.provider.send("evm_setNextBlockTimestamp", [seed]);
      await randomBox.setSeed();
    });

    it("returns expected result", async () => {
      const randomIndex = Math.floor(Math.random() * 10000);
      const compiledSeed = (randomIndex + seed) % 10000;
      const motherIndex = Math.floor(compiledSeed / 32);
      const childIndex = compiledSeed % 32;

      const bytes1Result = randomBytes[motherIndex][childIndex];

      const result = await randomBox
        .getPartIds(randomIndex)
        .then((v) => v.map((t) => t.toNumber()));

      expect(result).to.eql(new Array(3).fill(bytes1Result));
    });
  });
});
