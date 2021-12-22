import chai from "chai";

import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { TestRandomizer, TestRandomizer__factory } from "../../types";
import { solidity } from "ethereum-waffle";
import { checkChange } from "./utils/compare";
import { numbersToBytes } from "./utils/bit";

chai.use(solidity);
const { expect } = chai;

describe("Randomizer", () => {
  let snapshot: string;
  let randomizer: TestRandomizer;
  let [deployer, ...accounts]: SignerWithAddress[] = [];

  before(async () => {
    [deployer, ...accounts] = await ethers.getSigners();

    const Randomizer = new TestRandomizer__factory(deployer);
    randomizer = await Randomizer.deploy();
    await randomizer.deployed();
  });

  beforeEach(async () => {
    snapshot = await ethers.provider.send("evm_snapshot", []);
  });

  afterEach(async () => {
    await ethers.provider.send("evm_revert", [snapshot]);
  });

  const indexList = new Array(2 ** 8).fill(null).map((_, i) => i);
  const indexData = numbersToBytes(indexList);

  describe("setData", () => {
    it("set indexData, indexAmount", async () => {
      await checkChange({
        status: async () => {
          const indexData = await randomizer.indexData();
          const indexAmount = await randomizer.indexAmount();

          return { indexData, indexAmount: indexAmount.toNumber() };
        },
        process: () => randomizer.setData(indexData),
        expectedBefore: { indexData: "0x", indexAmount: 0 },
        expectedAfter: { indexData, indexAmount: indexList.length },
      });
    });
  });

  describe("getIndexList", () => {
    before(async () => {
      await randomizer.setData(indexData);
    });

    describe("returns appropriate indexList", () => {
      it("offset: 0, amount: 0", async () => {
        const result = await randomizer.getIndexList(0, 0);
        expect(result).to.eql([]);
      });

      it("offset: 0, amount: 10", async () => {
        const result = await randomizer.getIndexList(0, 10);
        expect(result).to.eql([...indexList].slice(0, 10));
      });

      it("offset: 10, amount: 5", async () => {
        const result = await randomizer.getIndexList(10, 5);
        expect(result).to.eql([...indexList].slice(10, 15));
      });

      it(`offset: ${indexList.length}, amount: 5`, async () => {
        const result = await randomizer.getIndexList(indexList.length, 5);
        expect(result).to.eql([...indexList].slice(0, 5));
      });

      it(`offset: ${indexList.length - 1}, amount: 5`, async () => {
        const result = await randomizer.getIndexList(indexList.length - 1, 5);
        expect(result).to.eql([
          indexList[indexList.length - 1],
          ...[...indexList].slice(0, 4),
        ]);
      });
    });
  });
});
