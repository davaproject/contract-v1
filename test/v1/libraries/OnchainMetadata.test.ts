import chai from "chai";

import { ethers } from "hardhat";
import {
  TestOnchainMetadata,
  TestOnchainMetadata__factory,
} from "../../../types";
import { solidity } from "ethereum-waffle";
import { rawStringToJson } from "../utils/metadata";
import { createImage, wrapImageWihtSvg } from "../utils/image";

chai.use(solidity);
const { expect } = chai;

describe("OnchainMetadata", () => {
  let onchainMetadata: TestOnchainMetadata;
  const data = {
    name: "test title",
    description: "test description",
    imgURIs: ["https://test.com/test1", "https://test.com/test2"],
    externalImgUri: "https://api.test.com/images",
    externalUri: "https://api.test.com/info",
    attributes: [
      {
        trait_type: "trait1",
        value: "trait value 1",
      },
      {
        trait_type: "trait2",
        value: "trait value 2",
      },
    ],
  };

  before(async () => {
    const [deployer] = await ethers.getSigners();
    const onchainMetadataTestContract = new TestOnchainMetadata__factory(
      deployer
    );
    onchainMetadata = await onchainMetadataTestContract.deploy();
    await onchainMetadata.deployed();
  });

  describe("toMetadata", () => {
    describe("should return expected result", () => {
      it("with empty imgURIs", async () => {
        const result = await onchainMetadata.toMetadata(
          data.name,
          data.description,
          [],
          data.externalImgUri,
          data.externalUri,
          data.attributes
        );
        const jsonResult = rawStringToJson(result);

        expect(jsonResult.name).to.eq(data.name);
        expect(jsonResult.description).to.eq(data.description);
        expect(JSON.stringify(jsonResult.attributes)).to.eq(
          JSON.stringify(data.attributes)
        );
        expect(jsonResult.raw_image).to.contain(createImage([]));
        expect(jsonResult.image).to.eq(data.externalImgUri);
      });

      it("with empty attributes", async () => {
        const result = await onchainMetadata.toMetadata(
          data.name,
          data.description,
          data.imgURIs,
          data.externalImgUri,
          data.externalUri,
          []
        );
        const jsonResult = rawStringToJson(result);

        expect(jsonResult.name).to.eq(data.name);
        expect(jsonResult.description).to.eq(data.description);
        expect(JSON.stringify(jsonResult.attributes)).to.eq(JSON.stringify([]));
        expect(jsonResult.raw_image).to.contain(createImage(data.imgURIs));
        expect(jsonResult.image).to.eq(data.externalImgUri);
      });

      it("with all data", async () => {
        const result = await onchainMetadata.toMetadata(
          data.name,
          data.description,
          data.imgURIs,
          data.externalImgUri,
          data.externalUri,
          data.attributes
        );
        const jsonResult = rawStringToJson(result);

        expect(jsonResult.name).to.eq(data.name);
        expect(jsonResult.description).to.eq(data.description);
        expect(JSON.stringify(jsonResult.attributes)).to.eq(
          JSON.stringify(data.attributes)
        );
        expect(jsonResult.raw_image).to.contain(createImage(data.imgURIs));
        expect(jsonResult.image).to.eq(data.externalImgUri);
      });
    });
  });

  describe("compileImages", () => {
    describe("should return proper image", () => {
      it("if imageURIs are not provided", async () => {
        const result = await onchainMetadata.compileImages([]);
        expect(result).to.contain(createImage([]));
      });

      it("with imageURIs", async () => {
        const result = await onchainMetadata.compileImages(data.imgURIs);
        expect(result).to.contain(createImage(data.imgURIs));
      });
    });
  });

  describe("toSVGImage", () => {
    it("should return proper SVG image", async () => {
      const imgUri = data.imgURIs[0];
      const result = await onchainMetadata.toSVGImage(imgUri);
      expect(result).to.equal(wrapImageWihtSvg(imgUri));
    });
  });
});
