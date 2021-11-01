import chai from "chai";

import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Dava, DavaOfficial } from "../../types";
import { solidity } from "ethereum-waffle";
import { fixtures } from "../../scripts/utils/fixtures";
import { createImage, createImageUri } from "./utils/image";

chai.use(solidity);
const { expect } = chai;

describe("ERC1155Asset", () => {
  let snapshot: string;
  let davaOfficial: DavaOfficial;
  let dava: Dava;
  let [deployer, ...accounts]: SignerWithAddress[] = [];
  let background: { tokenId: number; url: string };
  let foreground: { tokenId: number; url: string };

  before(async () => {
    [deployer, ...accounts] = await ethers.getSigners();
    const { contracts, assets } = await fixtures();
    davaOfficial = contracts.assets.davaOfficial;
    dava = contracts.dava;
    ({ background, foreground } = assets.defaultAsset);
  });

  beforeEach(async () => {
    snapshot = await ethers.provider.send("evm_snapshot", []);
  });
  afterEach(async () => {
    await ethers.provider.send("evm_revert", [snapshot]);
  });

  describe("createCollection", () => {
    const collectionName = "test";
    const zIndex = 1;

    beforeEach(async () => {});

    it("create collection", async () => {
      const supportedAssetTypesBefore =
        await davaOfficial.getAllSupportedAssetTypes();

      await davaOfficial.createCollection(
        collectionName,
        background.tokenId,
        foreground.tokenId,
        zIndex
      );

      const supportedAssetTypesAfter =
        await davaOfficial.getAllSupportedAssetTypes();

      expect(supportedAssetTypesAfter.length).to.equal(
        supportedAssetTypesBefore.length + 1
      );
    });

    describe("should be reverted", () => {
      beforeEach(async () => {
        await davaOfficial.createCollection(
          collectionName,
          background.tokenId,
          foreground.tokenId,
          zIndex
        );
      });

      it("for already registered name", async () => {
        await expect(
          davaOfficial.createCollection(
            collectionName,
            background.tokenId,
            foreground.tokenId,
            zIndex + 1
          )
        ).to.be.revertedWith("ERC1155Asset: already exists collection");
      });

      it("for already registered zIndex", async () => {
        await expect(
          davaOfficial.createCollection(
            collectionName + "test",
            background.tokenId,
            foreground.tokenId,
            zIndex
          )
        ).to.be.revertedWith("ERC1155Asset: already used zIndex");
      });

      it("for non existent background", async () => {
        await expect(
          davaOfficial.createCollection(
            collectionName + "test",
            background.tokenId + 100,
            foreground.tokenId + 100,
            zIndex + 1
          )
        ).to.be.revertedWith("ERC1155Asset: background image is not created");
      });
    });
  });

  describe("createAsset", () => {
    const collectionName = "test";
    const zIndex = 1;

    const assetInfo = {
      collectionType: ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes(collectionName)
      ),
      title: "testTitle",
      creator: ethers.Wallet.createRandom().address,
      description: "testDescription",
      uri: "https://test.com",
      attributes: [
        {
          trait_type: "testTrait1",
          value: "1",
        },
        {
          trait_type: "testTrait2",
          value: "2",
        },
      ],
      maxSupply: 10,
    };

    beforeEach(async () => {
      await davaOfficial.createCollection(
        collectionName,
        background.tokenId,
        foreground.tokenId,
        zIndex
      );
    });

    it("create asset", async () => {});

    describe("should be reverted", () => {
      it("if defaultAsset has non zero maxSupply", async () => {
        const defaultAssetType = await davaOfficial.DEFAULT_ASSET_TYPE();
        await expect(
          davaOfficial.createAsset(
            defaultAssetType,
            assetInfo.title,
            assetInfo.creator,
            assetInfo.description,
            assetInfo.uri,
            assetInfo.attributes,
            10
          )
        ).to.be.revertedWith(
          "ERC1155Asset: maxSupply of default asset should be zero"
        );
      });

      it("if maxSupply is zero", async () => {
        await expect(
          davaOfficial.createAsset(
            assetInfo.collectionType,
            assetInfo.title,
            assetInfo.creator,
            assetInfo.description,
            assetInfo.uri,
            assetInfo.attributes,
            0
          )
        ).to.be.revertedWith(
          "ERC1155Asset: maxSupply should be greater than zero"
        );
      });

      it("if collection does not exist", async () => {
        const newCollectionType = ethers.utils.keccak256(
          ethers.utils.toUtf8Bytes(new Date().toString())
        );

        await expect(
          davaOfficial.createAsset(
            newCollectionType,
            assetInfo.title,
            assetInfo.creator,
            assetInfo.description,
            assetInfo.uri,
            assetInfo.attributes,
            assetInfo.maxSupply
          )
        ).to.be.revertedWith("ERC1155Asset: non existent collection");
      });
    });
  });

  describe("uri", () => {
    const collectionName = "test";
    const zIndex = 1;

    const assetInfo = {
      collectionType: ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes(collectionName)
      ),
      title: "testTitle",
      creator: ethers.Wallet.createRandom().address,
      description: "testDescription",
      uri: "https://test.com",
      attributes: [
        {
          trait_type: "testTrait1",
          value: "1",
        },
        {
          trait_type: "testTrait2",
          value: "2",
        },
      ],
      maxSupply: 10,
    };

    let tokenId: number;

    beforeEach(async () => {
      await davaOfficial.createCollection(
        collectionName,
        background.tokenId,
        foreground.tokenId,
        zIndex
      );
      tokenId = await (await davaOfficial.numberOfAssets()).toNumber();
      await davaOfficial.createAsset(
        assetInfo.collectionType,
        assetInfo.title,
        assetInfo.creator,
        assetInfo.description,
        assetInfo.uri,
        assetInfo.attributes,
        assetInfo.maxSupply
      );
      await davaOfficial.mint(deployer.address, tokenId, 1, "0x");
    });

    it("should return expected metadata", async () => {
      const davaOfficialAddress = davaOfficial.address.toLowerCase();
      const metaData = {
        name: assetInfo.title,
        creator: assetInfo.creator.toLowerCase(),
        description: assetInfo.description,
        attributes: assetInfo.attributes,
        raw_image:
          "data:image/svg+xml;utf8," +
          createImage([background.url, assetInfo.uri, foreground.url]),
        image: createImageUri({
          host: "https://api.davaproject.com",
          layers: [
            { address: davaOfficialAddress, tokenId: background.tokenId },
            { address: davaOfficialAddress, tokenId },
            { address: davaOfficialAddress, tokenId: foreground.tokenId },
          ],
        }),
      };

      const expectedResult =
        "data:application/json;utf8," + JSON.stringify(metaData);
      const result = await davaOfficial.uri(tokenId);
      expect(result).to.equal(expectedResult);
    });
  });
});
