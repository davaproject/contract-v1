import chai from "chai";

import { ethers } from "hardhat";
import { TestURICompiler, TestURICompiler__factory } from "../../../types";
import { solidity } from "ethereum-waffle";
import { getFullUri } from "../utils/uri";

chai.use(solidity);
const { expect } = chai;

describe("URICompiler", () => {
  let uriCompiler: TestURICompiler;

  before(async () => {
    const [deployer] = await ethers.getSigners();
    const uriCompilerTestContract = new TestURICompiler__factory(deployer);
    uriCompiler = await uriCompilerTestContract.deploy();
    await uriCompiler.deployed();
  });

  describe("getFullUri", () => {
    describe("returns expected full uri", () => {
      const host = "htts://test.com";
      const params = ["test1", "test2"];
      const queries = [
        {
          key: "testKey1",
          value: "testVal1",
        },
        {
          key: "testKey2",
          value: "testVal2",
        },
      ];

      it("with empty params", async () => {
        const expectedResult = getFullUri({ host, params: [], queries });
        const result = await uriCompiler.getFullUri(host, [], queries);
        expect(result).to.equal(expectedResult);
      });

      it("with empty queries", async () => {
        const expectedResult = getFullUri({ host, params, queries: [] });
        const result = await uriCompiler.getFullUri(host, params, []);
        expect(result).to.equal(expectedResult);
      });

      it("with empty params & queries", async () => {
        const expectedResult = getFullUri({ host, params: [], queries: [] });
        const result = await uriCompiler.getFullUri(host, [], []);
        expect(result).to.equal(expectedResult);
      });

      it("with params & queries", async () => {
        const expectedResult = getFullUri({ host, params, queries });
        const result = await uriCompiler.getFullUri(host, params, queries);
        expect(result).to.equal(expectedResult);
      });
    });
  });
});
