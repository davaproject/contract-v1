import chai from "chai";

import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { DavaOfficial } from "../../types";
import { solidity } from "ethereum-waffle";
import { fixtures } from "../../scripts/utils/fixtures";
import { createImage, createImageUri } from "./utils/image";
import { categoryId } from "./utils/part";
import { checkChange } from "./utils/compare";
import { generatePartMetadataString } from "./utils/metadata";
import registeredData from "../../data.json";

chai.use(solidity);
const { expect } = chai;

describe("DavaOfficial", () => {
  let snapshot: string;
  let davaOfficial: DavaOfficial;
  let [deployer, ...accounts]: SignerWithAddress[] = [];
  let host: string;
  let background: { tokenId: number; ipfsHash: string };
  let foreground: { tokenId: number; ipfsHash: string };
  const gateway = registeredData.gatewayHandler.ipfsGateway.gateway;

  const testCategory = {
    backgroundImageTokenId: 0,
    foregroundImageTokenId: 0,
    name: "testPart0123",
    zIndex: 10,
  };
  const testParts = new Array(2).fill(null).map((_, i) => ({
    tokenId: 0,
    category: categoryId(testCategory.name),
    title: `new part ${i}`,
    creator: ethers.Wallet.createRandom().address,
    description: `new description ${i}`,
    ipfsHash: `${i}`,
    attributes: [],
    maxSupply: 10,
  }));

  before(async () => {
    [deployer, ...accounts] = await ethers.getSigners();
    const { contracts, parts } = await fixtures();
    davaOfficial = contracts.parts.davaOfficial;
    ({ host } = parts);
    ({ background, foreground } = parts.defaultPart);
    testCategory.backgroundImageTokenId = background.tokenId;
    testCategory.foregroundImageTokenId = foreground.tokenId;

    await davaOfficial.createCategory(
      testCategory.name,
      testCategory.backgroundImageTokenId,
      testCategory.foregroundImageTokenId,
      testCategory.zIndex
    );
    await testParts.reduce(
      (acc, v) =>
        acc.then(async () => {
          const tokenId = (await davaOfficial.numberOfParts()).toNumber();
          v.tokenId = tokenId;
          await davaOfficial.createPart(
            v.category,
            v.title,
            v.description,
            v.ipfsHash,
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
            .mint(nonMinter.address, testParts[0].tokenId, 1, "0x")
        ).to.be.reverted;
      });

      it("if exceeds maxSupply", async () => {
        await expect(
          davaOfficial.mint(
            deployer.address,
            testParts[0].tokenId,
            testParts[0].maxSupply + 1,
            "0x"
          )
        ).to.be.revertedWith("Part: Out of stock.");
      });
    });

    it("mint proper amount of tokens", async () => {
      const receiver = accounts[1];
      const targetPart = testParts[0];
      const mintAmount = 5;
      await checkChange({
        status: () =>
          davaOfficial.balanceOf(receiver.address, targetPart.tokenId),
        process: () =>
          davaOfficial.mint(
            receiver.address,
            targetPart.tokenId,
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
            .mintBatch(nonMinter.address, [testParts[0].tokenId], [1], "0x")
        ).to.be.reverted;
      });

      it("if exceeds maxSupply", async () => {
        await expect(
          davaOfficial.mintBatch(
            deployer.address,
            [testParts[0].tokenId],
            [testParts[0].maxSupply + 1],
            "0x"
          )
        ).to.be.revertedWith("Part: Out of stock.");
      });
    });

    it("mint proper amounts of tokens", async () => {
      const receiver = accounts[1];
      const mintAmounts = [5, 6];
      await checkChange({
        status: () =>
          davaOfficial.balanceOfBatch(
            [receiver.address, receiver.address],
            testParts.map(({ tokenId }) => tokenId)
          ),
        process: () =>
          davaOfficial.mintBatch(
            receiver.address,
            testParts.map(({ tokenId }) => tokenId),
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
      expect(result).to.equal(gateway + "/");
    });

    it("should return imageUri for existent token", async () => {
      const targetPart = testParts[0];
      const result = await davaOfficial.imageUri(targetPart.tokenId);
      expect(result).to.equal(gateway + "/" + targetPart.ipfsHash);
    });
  });

  describe("image", () => {
    it("should return image with SVG tag", async () => {
      const targetPart = testParts[0];
      const result = await davaOfficial.image(targetPart.tokenId);
      const expectedResult = createImage([gateway + "/" + targetPart.ipfsHash]);
      expect(result).to.equal(expectedResult);
    });
  });

  describe("getAllSupportedCategoryIds", () => {
    it("should return all registered category ids", async () => {
      const DEFAULT_CATEGORY = await davaOfficial.DEFAULT_CATEGORY();

      const result = await davaOfficial.getAllSupportedCategoryIds();
      expect(result).to.eql([DEFAULT_CATEGORY, categoryId(testCategory.name)]);
    });
  });

  describe("maxSupply", () => {
    it("should return proper maxSupply", async () => {
      const targetPart = testParts[0];
      const result = await davaOfficial.maxSupply(targetPart.tokenId);

      expect(result).to.equal(targetPart.maxSupply);
    });
  });

  describe("categoryTitle", () => {
    it("should return proper categoryTitle", async () => {
      const result = await davaOfficial.categoryTitle(testParts[0].tokenId);

      expect(result).to.equal(testCategory.name);
    });
  });

  describe("partTitle", () => {
    it("should return proper partTitle", async () => {
      const targetPart = testParts[0];
      const result = await davaOfficial.partTitle(targetPart.tokenId);

      expect(result).to.equal(targetPart.title);
    });
  });

  describe("category", () => {
    it("should return proper category", async () => {
      const targetPart = testParts[0];
      const result = await davaOfficial.categoryId(targetPart.tokenId);

      expect(result).to.equal(targetPart.category);
    });
  });

  describe("zIndex", () => {
    it("should return proper category zIndex", async () => {
      const targetPart = testParts[0];
      const result = await davaOfficial.zIndex(targetPart.tokenId);

      expect(result).to.equal(testCategory.zIndex);
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

  describe("categoryInfo", () => {
    it("should return proper category information", async () => {
      const result = await davaOfficial.categoryInfo(
        categoryId(testCategory.name)
      );
      expect(result[0]).to.equal(testCategory.name);
      expect(result[1]).to.equal(testCategory.backgroundImageTokenId);
      expect(result[2]).to.equal(testCategory.foregroundImageTokenId);
      expect(result[3]).to.equal(testCategory.zIndex);
    });
  });

  describe("createCategory", () => {
    it("create new category", async () => {
      const newCategory = {
        title: "new category",
        backgroundImageTokenId: testCategory.backgroundImageTokenId,
        foregroundImageTokenId: testCategory.foregroundImageTokenId,
        zIndex: 99999,
      };

      await checkChange({
        status: async () => {
          const amountOfCategories = (
            await davaOfficial.getAllSupportedCategoryIds()
          ).length;
          const [
            title,
            backgroundImageTokenId,
            foregroundImageTokenId,
            zIndex,
          ] = await davaOfficial.categoryInfo(categoryId(newCategory.title));

          return {
            amountOfCategories,
            categoryInfo: {
              title,
              backgroundImageTokenId,
              foregroundImageTokenId,
              zIndex,
            },
          };
        },
        process: () =>
          davaOfficial.createCategory(
            newCategory.title,
            newCategory.backgroundImageTokenId,
            newCategory.foregroundImageTokenId,
            newCategory.zIndex
          ),
        expectedBefore: {
          amountOfCategories: 2,
          categoryInfo: {
            title: "",
            backgroundImageTokenId: ethers.BigNumber.from(0),
            foregroundImageTokenId: ethers.BigNumber.from(0),
            zIndex: ethers.BigNumber.from(0),
          },
        },
        expectedAfter: {
          amountOfCategories: 3,
          categoryInfo: {
            title: newCategory.title,
            backgroundImageTokenId: ethers.BigNumber.from(
              newCategory.backgroundImageTokenId
            ),
            foregroundImageTokenId: ethers.BigNumber.from(
              newCategory.foregroundImageTokenId
            ),
            zIndex: ethers.BigNumber.from(newCategory.zIndex),
          },
        },
      });
    });

    describe("should be reverted", () => {
      it("for already registered name", async () => {
        await expect(
          davaOfficial.createCategory(
            testCategory.name,
            background.tokenId,
            foreground.tokenId,
            1000
          )
        ).to.be.revertedWith("Part: already exists category");
      });

      it("for already registered zIndex", async () => {
        await expect(
          davaOfficial.createCategory(
            testCategory.name + "123",
            background.tokenId,
            foreground.tokenId,
            testCategory.zIndex
          )
        ).to.be.revertedWith("Part: already used zIndex");
      });

      it("for non existent background", async () => {
        await expect(
          davaOfficial.createCategory(
            testCategory.name + "123",
            background.tokenId + 100,
            foreground.tokenId + 100,
            testCategory.zIndex + 1
          )
        ).to.be.revertedWith("Part: frame image is not created");
      });

      it("for non default part as a background", async () => {
        await expect(
          davaOfficial.createCategory(
            testCategory.name + "123",
            testParts[0].tokenId,
            testParts[1].tokenId,
            testCategory.zIndex + 1
          )
        ).to.be.revertedWith("Part: frame image is not created");
      });
    });
  });

  describe("createPart", () => {
    const newPart = {
      category: categoryId(testCategory.name),
      title: "new part test",
      creator: ethers.Wallet.createRandom().address,
      description: "create part test",
      ipfsHash: "123",
      attributes: [{ trait_type: "tesKey", value: "testVal" }],
      maxSupply: 10,
    };
    let tokenId: number;

    it("create part", async () => {
      tokenId = (await davaOfficial.numberOfParts()).toNumber();
      await checkChange({
        status: async () => {
          const numberOfParts = (await davaOfficial.numberOfParts()).toNumber();
          const category = await davaOfficial.categoryId(tokenId);
          const partTitle = await davaOfficial.partTitle(tokenId);
          const maxSupply = (await davaOfficial.maxSupply(tokenId)).toNumber();
          const imageUri = await davaOfficial.imageUri(tokenId);

          return {
            numberOfParts,
            category,
            partTitle,
            maxSupply,
            imageUri,
          };
        },
        process: () =>
          davaOfficial.createPart(
            newPart.category,
            newPart.title,
            newPart.description,
            newPart.ipfsHash,
            newPart.attributes,
            newPart.maxSupply
          ),
        expectedBefore: {
          numberOfParts: 4,
          category:
            "0x0000000000000000000000000000000000000000000000000000000000000000",
          partTitle: "",
          maxSupply: 0,
          imageUri: gateway + "/",
        },
        expectedAfter: {
          numberOfParts: 4 + 1,
          category: newPart.category,
          partTitle: newPart.title,
          maxSupply: newPart.maxSupply,
          imageUri: gateway + "/" + newPart.ipfsHash,
        },
      });
    });

    describe("should be reverted", () => {
      it("if defaultPart has non zero maxSupply", async () => {
        const defaultCategory = await davaOfficial.DEFAULT_CATEGORY();
        await expect(
          davaOfficial.createPart(
            defaultCategory,
            newPart.title,
            newPart.description,
            newPart.ipfsHash,
            newPart.attributes,
            newPart.maxSupply
          )
        ).to.be.revertedWith(
          "Part: maxSupply of default category should be zero"
        );
      });

      it("if maxSupply is zero", async () => {
        await expect(
          davaOfficial.createPart(
            newPart.category,
            newPart.title,
            newPart.description,
            newPart.ipfsHash,
            newPart.attributes,
            0
          )
        ).to.be.revertedWith("Part: maxSupply should be greater than zero");
      });

      it("if category does not exist", async () => {
        const newCategory = categoryId(new Date().toString());

        await expect(
          davaOfficial.createPart(
            newCategory,
            newPart.title,
            newPart.description,
            newPart.ipfsHash,
            newPart.attributes,
            newPart.maxSupply
          )
        ).to.be.revertedWith("Part: non existent category");
      });
    });
  });

  describe("uri", () => {
    const category = "test";
    const zIndex = 1;

    const partInfo = {
      category: categoryId(category),
      title: "testTitle",
      description: "testDescription",
      ipfsHash: "test",
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
      await davaOfficial.createCategory(
        category,
        background.tokenId,
        foreground.tokenId,
        zIndex
      );
      tokenId = await (await davaOfficial.numberOfParts()).toNumber();
      await davaOfficial.createPart(
        partInfo.category,
        partInfo.title,
        partInfo.description,
        partInfo.ipfsHash,
        partInfo.attributes,
        partInfo.maxSupply
      );
      await davaOfficial.mint(deployer.address, tokenId, 1, "0x");
    });

    it("should return expected metadata", async () => {
      const davaOfficialAddress = davaOfficial.address.toLowerCase();
      const expectedResult = generatePartMetadataString({
        name: partInfo.title,
        description: partInfo.description,
        attributes: partInfo.attributes,
        rawImage:
          "data:image/svg+xml;utf8," +
          createImage([
            gateway + "/" + background.ipfsHash,
            gateway + "/" + partInfo.ipfsHash,
            gateway + "/" + foreground.ipfsHash,
          ]),
        imageUri: createImageUri({
          host: registeredData.gatewayHandler.davaGateway.gateway,
          layers: [
            { address: davaOfficialAddress, tokenId: background.tokenId },
            { address: davaOfficialAddress, tokenId },
            { address: davaOfficialAddress, tokenId: foreground.tokenId },
          ],
        }),
        collection: davaOfficial.address,
        tokenId: `${tokenId}`,
        maxSupply: partInfo.maxSupply.toString(),
        type: category,
        host,
      });

      const result = await davaOfficial.uri(tokenId);
      expect(result).to.equal(expectedResult);
    });
  });
});
