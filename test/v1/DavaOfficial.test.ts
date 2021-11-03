import chai from "chai";

import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Dava, DavaOfficial } from "../../types";
import { solidity } from "ethereum-waffle";
import { fixtures } from "../../scripts/utils/fixtures";
import { createImage, createImageUri } from "./utils/image";
import { assetType } from "./utils/asset";
import { checkChange } from "./utils/compare";

chai.use(solidity);
const { expect } = chai;

describe("DavaOfficial", () => {
  let snapshot: string;
  let davaOfficial: DavaOfficial;
  let dava: Dava;
  let [deployer, ...accounts]: SignerWithAddress[] = [];
  let host: string;
  let background: { tokenId: number; url: string };
  let foreground: { tokenId: number; url: string };

  const testAssetType = {
    backgroundImageTokenId: 0,
    foregroundImageTokenId: 0,
    name: "testAsset0123",
    zIndex: 10,
  };
  const testAssets = new Array(2).fill(null).map((_, i) => ({
    tokenId: 0,
    assetType: assetType(testAssetType.name),
    title: `new asset ${i}`,
    creator: ethers.Wallet.createRandom().address,
    description: `new description ${i}`,
    uri: `http://test.com/${i}`,
    attributes: [],
    maxSupply: 10,
  }));

  before(async () => {
    [deployer, ...accounts] = await ethers.getSigners();
    const { contracts, assets } = await fixtures();
    davaOfficial = contracts.assets.davaOfficial;
    dava = contracts.dava;
    ({ host } = assets);
    ({ background, foreground } = assets.defaultAsset);
    testAssetType.backgroundImageTokenId = background.tokenId;
    testAssetType.foregroundImageTokenId = foreground.tokenId;

    await davaOfficial.createAssetType(
      testAssetType.name,
      testAssetType.backgroundImageTokenId,
      testAssetType.foregroundImageTokenId,
      testAssetType.zIndex
    );
    await testAssets.reduce(
      (acc, v) =>
        acc.then(async () => {
          const tokenId = (await davaOfficial.numberOfAssets()).toNumber();
          v.tokenId = tokenId;
          await davaOfficial.createAsset(
            v.assetType,
            v.title,
            v.creator,
            v.description,
            v.uri,
            v.attributes,
            v.maxSupply
          );
        }),
      Promise.resolve()
    );
  });

  beforeEach(async () => {
    snapshot = await ethers.provider.send("evm_snapshot", []);
  });
  afterEach(async () => {
    await ethers.provider.send("evm_revert", [snapshot]);
  });

  describe("setBaseURI", () => {
    it("should be reverted if non owner tries to call", async () => {
      const nonOwner = accounts[1];
      const owner = await davaOfficial.baseURI();
      expect(owner).not.to.equal(nonOwner.address);

      await expect(davaOfficial.connect(nonOwner).setBaseURI("TEST")).to.be
        .reverted;
    });

    it("should set baseUri", async () => {
      const newUri = "test";
      await checkChange({
        status: () => davaOfficial.baseURI(),
        process: () => davaOfficial.setBaseURI(newUri),
        expectedBefore: host,
        expectedAfter: newUri,
      });
    });
  });

  describe("mint", () => {
    describe("should be reverted", () => {
      it("if msg.sender does not have MINTER_ROLE", async () => {
        const nonMinter = accounts[1];
        const MINTER_ROLE = await davaOfficial.MINTER_ROLE();
        const isMinter = await davaOfficial.hasRole(
          MINTER_ROLE,
          nonMinter.address
        );
        expect(isMinter).to.be.false;

        await expect(
          davaOfficial
            .connect(nonMinter)
            .mint(nonMinter.address, testAssets[0].tokenId, 1, "0x")
        ).to.be.reverted;
      });

      it("if exceeds maxSupply", async () => {
        await expect(
          davaOfficial.mint(
            deployer.address,
            testAssets[0].tokenId,
            testAssets[0].maxSupply + 1,
            "0x"
          )
        ).to.be.revertedWith("Asset: Out of stock.");
      });
    });

    it("mint proper amount of tokens", async () => {
      const receiver = accounts[1];
      const targetAsset = testAssets[0];
      const mintAmount = 5;
      await checkChange({
        status: () =>
          davaOfficial.balanceOf(receiver.address, targetAsset.tokenId),
        process: () =>
          davaOfficial.mint(
            receiver.address,
            targetAsset.tokenId,
            mintAmount,
            "0x"
          ),
        expectedBefore: ethers.BigNumber.from(0),
        expectedAfter: ethers.BigNumber.from(mintAmount),
      });
    });
  });

  describe("mintBatch", () => {
    describe("should be reverted", () => {
      it("if msg.sender does not have MINTER_ROLE", async () => {
        const nonMinter = accounts[1];
        const MINTER_ROLE = await davaOfficial.MINTER_ROLE();
        const isMinter = await davaOfficial.hasRole(
          MINTER_ROLE,
          nonMinter.address
        );
        expect(isMinter).to.be.false;

        await expect(
          davaOfficial
            .connect(nonMinter)
            .mintBatch(nonMinter.address, [testAssets[0].tokenId], [1], "0x")
        ).to.be.reverted;
      });

      it("if exceeds maxSupply", async () => {
        await expect(
          davaOfficial.mintBatch(
            deployer.address,
            [testAssets[0].tokenId],
            [testAssets[0].maxSupply + 1],
            "0x"
          )
        ).to.be.revertedWith("Asset: Out of stock.");
      });
    });

    it("mint proper amounts of tokens", async () => {
      const receiver = accounts[1];
      const mintAmounts = [5, 6];
      await checkChange({
        status: () =>
          davaOfficial.balanceOfBatch(
            [receiver.address, receiver.address],
            testAssets.map(({ tokenId }) => tokenId)
          ),
        process: () =>
          davaOfficial.mintBatch(
            receiver.address,
            testAssets.map(({ tokenId }) => tokenId),
            mintAmounts,
            "0x"
          ),
        expectedBefore: [ethers.BigNumber.from(0), ethers.BigNumber.from(0)],
        expectedAfter: mintAmounts.map(ethers.BigNumber.from),
      });
    });
  });

  describe("imageUri", () => {
    it("should return empty for non-existent token", async () => {
      const result = await davaOfficial.imageUri(99999);
      expect(result).to.equal("");
    });

    it("should return imageUri for existent token", async () => {
      const targetAsset = testAssets[0];
      const result = await davaOfficial.imageUri(targetAsset.tokenId);
      expect(result).to.equal(targetAsset.uri);
    });
  });

  describe("image", () => {
    it("should return image with SVG tag", async () => {
      const targetAsset = testAssets[0];
      const result = await davaOfficial.image(targetAsset.tokenId);
      const expectedResult = createImage([targetAsset.uri]);
      expect(result).to.equal(expectedResult);
    });
  });

  describe("getAllSupportedAssetTypes", () => {
    it("should return all registered asset types", async () => {
      const DEFAULT_ASSET_TYPE = await davaOfficial.DEFAULT_ASSET_TYPE();

      const result = await davaOfficial.getAllSupportedAssetTypes();
      expect(result).to.eql([
        DEFAULT_ASSET_TYPE,
        assetType(testAssetType.name),
      ]);
    });
  });

  describe("creator", () => {
    it("should return proper creator address", async () => {
      const targetAsset = testAssets[0];
      const result = await davaOfficial.creator(targetAsset.tokenId);

      expect(result).to.equal(targetAsset.creator);
    });
  });

  describe("maxSupply", () => {
    it("should return proper maxSupply", async () => {
      const targetAsset = testAssets[0];
      const result = await davaOfficial.maxSupply(targetAsset.tokenId);

      expect(result).to.equal(targetAsset.maxSupply);
    });
  });

  describe("assetTypeTitle", () => {
    it("should return proper assetTypeTitle", async () => {
      const result = await davaOfficial.assetTypeTitle(testAssets[0].tokenId);

      expect(result).to.equal(testAssetType.name);
    });
  });

  describe("assetTitle", () => {
    it("should return proper assetTitle", async () => {
      const targetAsset = testAssets[0];
      const result = await davaOfficial.assetTitle(targetAsset.tokenId);

      expect(result).to.equal(targetAsset.title);
    });
  });

  describe("assetType", () => {
    it("should return proper assetType", async () => {
      const targetAsset = testAssets[0];
      const result = await davaOfficial.assetType(targetAsset.tokenId);

      expect(result).to.equal(targetAsset.assetType);
    });
  });

  describe("zIndex", () => {
    it("should return proper assetType", async () => {
      const targetAsset = testAssets[0];
      const result = await davaOfficial.zIndex(targetAsset.tokenId);

      expect(result).to.equal(testAssetType.zIndex);
    });
  });

  describe("isApprovedForAll", () => {
    it("should be false for non-operator", async () => {
      const nonOperator = accounts[1];
      const isApproved = await davaOfficial.isApprovedForAll(
        deployer.address,
        nonOperator.address
      );
      expect(isApproved).to.be.false;
    });

    it("should be true for operator", async () => {
      const operator = accounts[1];
      await davaOfficial.setApprovalForAll(operator.address, true);

      const isApproved = await davaOfficial.isApprovedForAll(
        deployer.address,
        operator.address
      );
      expect(isApproved).to.be.true;
    });
  });

  describe("assetTypeInfo", () => {
    it("should return proper assetType information", async () => {
      const result = await davaOfficial.assetTypeInfo(
        assetType(testAssetType.name)
      );
      expect(result[0]).to.equal(testAssetType.name);
      expect(result[1]).to.equal(testAssetType.backgroundImageTokenId);
      expect(result[2]).to.equal(testAssetType.foregroundImageTokenId);
      expect(result[3]).to.equal(testAssetType.zIndex);
    });
  });

  describe("createAssetType", () => {
    it("create new assetType", async () => {
      const newAssetType = {
        name: "new asset type",
        backgroundImageTokenId: testAssetType.backgroundImageTokenId,
        foregroundImageTokenId: testAssetType.foregroundImageTokenId,
        zIndex: 99999,
      };

      await checkChange({
        status: async () => {
          const amountOfAssetTypes = (
            await davaOfficial.getAllSupportedAssetTypes()
          ).length;
          const [name, backgroundImageTokenId, foregroundImageTokenId, zIndex] =
            await davaOfficial.assetTypeInfo(assetType(newAssetType.name));

          return {
            amountOfAssetTypes,
            assetTypeInfo: {
              name,
              backgroundImageTokenId,
              foregroundImageTokenId,
              zIndex,
            },
          };
        },
        process: () =>
          davaOfficial.createAssetType(
            newAssetType.name,
            newAssetType.backgroundImageTokenId,
            newAssetType.foregroundImageTokenId,
            newAssetType.zIndex
          ),
        expectedBefore: {
          amountOfAssetTypes: 2,
          assetTypeInfo: {
            name: "",
            backgroundImageTokenId: ethers.BigNumber.from(0),
            foregroundImageTokenId: ethers.BigNumber.from(0),
            zIndex: ethers.BigNumber.from(0),
          },
        },
        expectedAfter: {
          amountOfAssetTypes: 3,
          assetTypeInfo: {
            name: newAssetType.name,
            backgroundImageTokenId: ethers.BigNumber.from(
              newAssetType.backgroundImageTokenId
            ),
            foregroundImageTokenId: ethers.BigNumber.from(
              newAssetType.foregroundImageTokenId
            ),
            zIndex: ethers.BigNumber.from(newAssetType.zIndex),
          },
        },
      });
    });

    describe("should be reverted", () => {
      it("for already registered name", async () => {
        await expect(
          davaOfficial.createAssetType(
            testAssetType.name,
            background.tokenId,
            foreground.tokenId,
            1000
          )
        ).to.be.revertedWith("Asset: already exists assetType");
      });

      it("for already registered zIndex", async () => {
        await expect(
          davaOfficial.createAssetType(
            testAssetType.name + "123",
            background.tokenId,
            foreground.tokenId,
            testAssetType.zIndex
          )
        ).to.be.revertedWith("Asset: already used zIndex");
      });

      it("for non existent background", async () => {
        await expect(
          davaOfficial.createAssetType(
            testAssetType.name + "123",
            background.tokenId + 100,
            foreground.tokenId + 100,
            testAssetType.zIndex + 1
          )
        ).to.be.revertedWith("Asset: background image is not created");
      });

      it("for non default asset as a background", async () => {
        await expect(
          davaOfficial.createAssetType(
            testAssetType.name + "123",
            testAssets[0].tokenId,
            testAssets[1].tokenId,
            testAssetType.zIndex + 1
          )
        ).to.be.revertedWith("Asset: background image is not created");
      });
    });
  });

  describe("createAsset", () => {
    const newAsset = {
      assetType: assetType(testAssetType.name),
      title: "new asset test",
      creator: ethers.Wallet.createRandom().address,
      description: "create asset test",
      uri: "https://new.test.com/123",
      attributes: [{ trait_type: "tesKey", value: "testVal" }],
      maxSupply: 10,
    };
    let tokenId: number;

    it("create asset", async () => {
      tokenId = (await davaOfficial.numberOfAssets()).toNumber();
      await checkChange({
        status: async () => {
          const numberOfAssets = (
            await davaOfficial.numberOfAssets()
          ).toNumber();
          const maxTotalAssetSupply = (
            await davaOfficial.maxTotalAssetSupply()
          ).toNumber();

          const assetType = await davaOfficial.assetType(tokenId);
          const assetTitle = await davaOfficial.assetTitle(tokenId);
          const maxSupply = (await davaOfficial.maxSupply(tokenId)).toNumber();
          const creator = await davaOfficial.creator(tokenId);
          const imageUri = await davaOfficial.imageUri(tokenId);

          return {
            numberOfAssets,
            maxTotalAssetSupply,
            assetType,
            assetTitle,
            maxSupply,
            creator,
            imageUri,
          };
        },
        process: () =>
          davaOfficial.createAsset(
            newAsset.assetType,
            newAsset.title,
            newAsset.creator,
            newAsset.description,
            newAsset.uri,
            newAsset.attributes,
            newAsset.maxSupply
          ),
        expectedBefore: {
          numberOfAssets: 4,
          maxTotalAssetSupply: 20,
          assetType:
            "0x0000000000000000000000000000000000000000000000000000000000000000",
          assetTitle: "",
          maxSupply: 0,
          creator: ethers.constants.AddressZero,
          imageUri: "",
        },
        expectedAfter: {
          numberOfAssets: 4 + 1,
          maxTotalAssetSupply: 20 + newAsset.maxSupply,
          assetType: newAsset.assetType,
          assetTitle: newAsset.title,
          maxSupply: newAsset.maxSupply,
          creator: newAsset.creator,
          imageUri: newAsset.uri,
        },
      });
    });

    describe("should be reverted", () => {
      it("if defaultAsset has non zero maxSupply", async () => {
        const defaultAssetType = await davaOfficial.DEFAULT_ASSET_TYPE();
        await expect(
          davaOfficial.createAsset(
            defaultAssetType,
            newAsset.title,
            newAsset.creator,
            newAsset.description,
            newAsset.uri,
            newAsset.attributes,
            newAsset.maxSupply
          )
        ).to.be.revertedWith(
          "Asset: maxSupply of default asset should be zero"
        );
      });

      it("if maxSupply is zero", async () => {
        await expect(
          davaOfficial.createAsset(
            newAsset.assetType,
            newAsset.title,
            newAsset.creator,
            newAsset.description,
            newAsset.uri,
            newAsset.attributes,
            0
          )
        ).to.be.revertedWith("Asset: maxSupply should be greater than zero");
      });

      it("if assetType does not exist", async () => {
        const newCollectionType = ethers.utils.keccak256(
          ethers.utils.toUtf8Bytes(new Date().toString())
        );

        await expect(
          davaOfficial.createAsset(
            newCollectionType,
            newAsset.title,
            newAsset.creator,
            newAsset.description,
            newAsset.uri,
            newAsset.attributes,
            newAsset.maxSupply
          )
        ).to.be.revertedWith("Asset: non existent assetType");
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
      await davaOfficial.createAssetType(
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
