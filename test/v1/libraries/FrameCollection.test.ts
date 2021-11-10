import chai from "chai";

import { ethers } from "hardhat";
import {
  TestFrameCollection,
  TestFrameCollection__factory,
} from "../../../types";
import { solidity } from "ethereum-waffle";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { checkChange } from "../utils/compare";

chai.use(solidity);
const { expect } = chai;

describe("FrameCollection", () => {
  let snapshot: string;
  let frameCollection: TestFrameCollection;
  let [deployer, ...accounts]: Array<SignerWithAddress> = [];
  let data = [
    {
      id: 0,
      imgUri: "https://test.com/testImg0.png",
      zIndex: 5,
    },
    {
      id: 1,
      imgUri: "https://test.com/testImg1.png",
      zIndex: 7,
    },
  ];

  before(async () => {
    [deployer, ...accounts] = await ethers.getSigners();
    const frameCollectionTestContract = new TestFrameCollection__factory(
      deployer
    );
    frameCollection = await frameCollectionTestContract.deploy();
    await frameCollection.deployed();

    await frameCollection.registerFrame(data[0].imgUri, data[0].zIndex);
    await frameCollection.registerFrame(data[1].imgUri, data[1].zIndex);
  });

  beforeEach(async () => {
    snapshot = await ethers.provider.send("evm_snapshot", []);
  });

  afterEach(async () => {
    await ethers.provider.send("evm_revert", [snapshot]);
  });

  describe("registerFrame", () => {
    it("should be reverted if non-operator try to call", async () => {
      const nonOperator = accounts[1];
      const OPERATOR_ROLE = await frameCollection.OPERATOR_ROLE();
      const isOperator = await frameCollection.hasRole(
        OPERATOR_ROLE,
        nonOperator.address
      );
      expect(isOperator).to.be.false;

      await expect(
        frameCollection
          .connect(nonOperator)
          .registerFrame(data[0].imgUri, data[0].zIndex)
      ).to.be.reverted;
    });

    it("should set frame successfully", async () => {
      const zeroBigNumber = ethers.BigNumber.from(0);
      await checkChange({
        status: () => frameCollection.frameOf(data.length),
        process: () =>
          frameCollection.registerFrame(data[0].imgUri, data[0].zIndex),
        expectedBefore: [zeroBigNumber, "", zeroBigNumber],
        expectedAfter: [
          ethers.BigNumber.from(data.length),
          data[0].imgUri,
          ethers.BigNumber.from(data[0].zIndex),
        ],
      });
    });
  });

  describe("removeFrame", () => {
    it("should be reverted if frame is not registered", async () => {
      const nonExistentFrameId = 9999;
      const frames = await frameCollection.getAllFrames();
      frames.forEach(([id]) => {
        expect(id.toNumber()).not.to.equal(nonExistentFrameId);
      });

      await expect(
        frameCollection.removeFrame(nonExistentFrameId)
      ).to.be.revertedWith("FrameCollection: Unregistered frame");
    });

    it("should remove frame", async () => {
      const zeroBigNumber = ethers.BigNumber.from(0);
      await checkChange({
        status: () => frameCollection.frameOf(data[0].id),
        process: () => frameCollection.removeFrame(data[0].id),
        expectedBefore: [
          zeroBigNumber,
          data[0].imgUri,
          ethers.BigNumber.from(data[0].zIndex),
        ],
        expectedAfter: [zeroBigNumber, "", zeroBigNumber],
      });
    });
  });

  describe("frameOf", () => {
    it("should return proper frame", async () => {
      const result = await frameCollection.frameOf(data[0].id);
      expect(result.id.toNumber()).to.equal(data[0].id);
      expect(result.imgUri).to.equal(data[0].imgUri);
      expect(result.zIndex.toNumber()).to.equal(data[0].zIndex);
    });
  });

  describe("getAllFrames", () => {
    it("should return all registered frames", async () => {
      const result = await frameCollection.getAllFrames();
      result.forEach((frame, i) => {
        expect(frame.id.toNumber()).to.equal(data[i].id);
        expect(frame.imgUri).to.equal(data[i].imgUri);
        expect(frame.zIndex.toNumber()).to.equal(data[i].zIndex);
      });
    });
  });

  describe("totalFrames", () => {
    it("returns total frames", async () => {
      await checkChange({
        status: () => frameCollection.totalFrames(),
        process: () => frameCollection.removeFrame(data[0].id),
        expectedBefore: ethers.BigNumber.from(2),
        expectedAfter: ethers.BigNumber.from(1),
      });
    });
  });
});
