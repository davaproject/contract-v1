import chai from "chai";

import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Dava, DavaOfficial } from "../../types";
import { solidity } from "ethereum-waffle";
import { fixtures } from "../../scripts/utils/fixtures";
import { createImage, createImageUri } from "./utils/image";
import { partType } from "./utils/part";
import { checkChange } from "./utils/compare";
import { generatePartMetadataString } from "./utils/metadata";

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

  const testPartType = {
    backgroundImageTokenId: 0,
    foregroundImageTokenId: 0,
    name: "testPart0123",
    zIndex: 10,
  };
  const testParts = new Array(2).fill(null).map((_, i) => ({
    tokenId: 0,
    partType: partType(testPartType.name),
    title: `new part ${i}`,
    creator: ethers.Wallet.createRandom().address,
    description: `new description ${i}`,
    uri: `http://test.com/${i}`,
    attributes: [],
    maxSupply: 10,
  }));

  before(async () => {
    [deployer, ...accounts] = await ethers.getSigners();
    const { contracts, parts } = await fixtures();
    davaOfficial = contracts.parts.davaOfficial;
    dava = contracts.dava;
    ({ host } = parts);
    ({ background, foreground } = parts.defaultPart);
    testPartType.backgroundImageTokenId = background.tokenId;
    testPartType.foregroundImageTokenId = foreground.tokenId;

    await davaOfficial.createPartType(
      testPartType.name,
      testPartType.backgroundImageTokenId,
      testPartType.foregroundImageTokenId,
      testPartType.zIndex
    );
    await testParts.reduce(
      (acc, v) =>
        acc.then(async () => {
          const tokenId = (await davaOfficial.numberOfParts()).toNumber();
          v.tokenId = tokenId;
          await davaOfficial.createPart(
            v.partType,
            v.title,
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
      expect(result).to.equal("");
    });

    it("should return imageUri for existent token", async () => {
      const targetPart = testParts[0];
      const result = await davaOfficial.imageUri(targetPart.tokenId);
      expect(result).to.equal(targetPart.uri);
    });
  });

  describe("image", () => {
    it("should return image with SVG tag", async () => {
      const targetPart = testParts[0];
      const result = await davaOfficial.image(targetPart.tokenId);
      const expectedResult = createImage([targetPart.uri]);
      expect(result).to.equal(expectedResult);
    });
  });

  describe("getAllSupportedPartTypes", () => {
    it("should return all registered part types", async () => {
      const DEFAULT_PART_TYPE = await davaOfficial.DEFAULT_PART_TYPE();

      const result = await davaOfficial.getAllSupportedPartTypes();
      expect(result).to.eql([DEFAULT_PART_TYPE, partType(testPartType.name)]);
    });
  });

  describe("maxSupply", () => {
    it("should return proper maxSupply", async () => {
      const targetPart = testParts[0];
      const result = await davaOfficial.maxSupply(targetPart.tokenId);

      expect(result).to.equal(targetPart.maxSupply);
    });
  });

  describe("partTypeTitle", () => {
    it("should return proper partTypeTitle", async () => {
      const result = await davaOfficial.partTypeTitle(testParts[0].tokenId);

      expect(result).to.equal(testPartType.name);
    });
  });

  describe("partTitle", () => {
    it("should return proper partTitle", async () => {
      const targetPart = testParts[0];
      const result = await davaOfficial.partTitle(targetPart.tokenId);

      expect(result).to.equal(targetPart.title);
    });
  });

  describe("partType", () => {
    it("should return proper partType", async () => {
      const targetPart = testParts[0];
      const result = await davaOfficial.partType(targetPart.tokenId);

      expect(result).to.equal(targetPart.partType);
    });
  });

  describe("zIndex", () => {
    it("should return proper partType", async () => {
      const targetPart = testParts[0];
      const result = await davaOfficial.zIndex(targetPart.tokenId);

      expect(result).to.equal(testPartType.zIndex);
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

  describe("partTypeInfo", () => {
    it("should return proper partType information", async () => {
      const result = await davaOfficial.partTypeInfo(
        partType(testPartType.name)
      );
      expect(result[0]).to.equal(testPartType.name);
      expect(result[1]).to.equal(testPartType.backgroundImageTokenId);
      expect(result[2]).to.equal(testPartType.foregroundImageTokenId);
      expect(result[3]).to.equal(testPartType.zIndex);
    });
  });

  describe("createPartType", () => {
    it("create new partType", async () => {
      const newPartType = {
        name: "new part type",
        backgroundImageTokenId: testPartType.backgroundImageTokenId,
        foregroundImageTokenId: testPartType.foregroundImageTokenId,
        zIndex: 99999,
      };

      await checkChange({
        status: async () => {
          const amountOfPartTypes = (
            await davaOfficial.getAllSupportedPartTypes()
          ).length;
          const [name, backgroundImageTokenId, foregroundImageTokenId, zIndex] =
            await davaOfficial.partTypeInfo(partType(newPartType.name));

          return {
            amountOfPartTypes,
            partTypeInfo: {
              name,
              backgroundImageTokenId,
              foregroundImageTokenId,
              zIndex,
            },
          };
        },
        process: () =>
          davaOfficial.createPartType(
            newPartType.name,
            newPartType.backgroundImageTokenId,
            newPartType.foregroundImageTokenId,
            newPartType.zIndex
          ),
        expectedBefore: {
          amountOfPartTypes: 2,
          partTypeInfo: {
            name: "",
            backgroundImageTokenId: ethers.BigNumber.from(0),
            foregroundImageTokenId: ethers.BigNumber.from(0),
            zIndex: ethers.BigNumber.from(0),
          },
        },
        expectedAfter: {
          amountOfPartTypes: 3,
          partTypeInfo: {
            name: newPartType.name,
            backgroundImageTokenId: ethers.BigNumber.from(
              newPartType.backgroundImageTokenId
            ),
            foregroundImageTokenId: ethers.BigNumber.from(
              newPartType.foregroundImageTokenId
            ),
            zIndex: ethers.BigNumber.from(newPartType.zIndex),
          },
        },
      });
    });

    describe("should be reverted", () => {
      it("for already registered name", async () => {
        await expect(
          davaOfficial.createPartType(
            testPartType.name,
            background.tokenId,
            foreground.tokenId,
            1000
          )
        ).to.be.revertedWith("Part: already exists partType");
      });

      it("for already registered zIndex", async () => {
        await expect(
          davaOfficial.createPartType(
            testPartType.name + "123",
            background.tokenId,
            foreground.tokenId,
            testPartType.zIndex
          )
        ).to.be.revertedWith("Part: already used zIndex");
      });

      it("for non existent background", async () => {
        await expect(
          davaOfficial.createPartType(
            testPartType.name + "123",
            background.tokenId + 100,
            foreground.tokenId + 100,
            testPartType.zIndex + 1
          )
        ).to.be.revertedWith("Part: background image is not created");
      });

      it("for non default part as a background", async () => {
        await expect(
          davaOfficial.createPartType(
            testPartType.name + "123",
            testParts[0].tokenId,
            testParts[1].tokenId,
            testPartType.zIndex + 1
          )
        ).to.be.revertedWith("Part: background image is not created");
      });
    });
  });

  describe("createPart", () => {
    const newPart = {
      partType: partType(testPartType.name),
      title: "new part test",
      creator: ethers.Wallet.createRandom().address,
      description: "create part test",
      uri: "https://new.test.com/123",
      attributes: [{ trait_type: "tesKey", value: "testVal" }],
      maxSupply: 10,
    };
    let tokenId: number;

    it("create part", async () => {
      tokenId = (await davaOfficial.numberOfParts()).toNumber();
      await checkChange({
        status: async () => {
          const numberOfParts = (await davaOfficial.numberOfParts()).toNumber();
          const maxTotalPartSupply = (
            await davaOfficial.maxTotalPartSupply()
          ).toNumber();

          const partType = await davaOfficial.partType(tokenId);
          const partTitle = await davaOfficial.partTitle(tokenId);
          const maxSupply = (await davaOfficial.maxSupply(tokenId)).toNumber();
          const imageUri = await davaOfficial.imageUri(tokenId);

          return {
            numberOfParts,
            maxTotalPartSupply,
            partType,
            partTitle,
            maxSupply,
            imageUri,
          };
        },
        process: () =>
          davaOfficial.createPart(
            newPart.partType,
            newPart.title,
            newPart.description,
            newPart.uri,
            newPart.attributes,
            newPart.maxSupply
          ),
        expectedBefore: {
          numberOfParts: 4,
          maxTotalPartSupply: 20,
          partType:
            "0x0000000000000000000000000000000000000000000000000000000000000000",
          partTitle: "",
          maxSupply: 0,
          imageUri: "",
        },
        expectedAfter: {
          numberOfParts: 4 + 1,
          maxTotalPartSupply: 20 + newPart.maxSupply,
          partType: newPart.partType,
          partTitle: newPart.title,
          maxSupply: newPart.maxSupply,
          imageUri: newPart.uri,
        },
      });
    });

    describe("should be reverted", () => {
      it("if defaultPart has non zero maxSupply", async () => {
        const defaultPartType = await davaOfficial.DEFAULT_PART_TYPE();
        await expect(
          davaOfficial.createPart(
            defaultPartType,
            newPart.title,
            newPart.description,
            newPart.uri,
            newPart.attributes,
            newPart.maxSupply
          )
        ).to.be.revertedWith("Part: maxSupply of default part should be zero");
      });

      it("if maxSupply is zero", async () => {
        await expect(
          davaOfficial.createPart(
            newPart.partType,
            newPart.title,
            newPart.description,
            newPart.uri,
            newPart.attributes,
            0
          )
        ).to.be.revertedWith("Part: maxSupply should be greater than zero");
      });

      it("if partType does not exist", async () => {
        const newCollectionType = ethers.utils.keccak256(
          ethers.utils.toUtf8Bytes(new Date().toString())
        );

        await expect(
          davaOfficial.createPart(
            newCollectionType,
            newPart.title,
            newPart.description,
            newPart.uri,
            newPart.attributes,
            newPart.maxSupply
          )
        ).to.be.revertedWith("Part: non existent partType");
      });
    });
  });

  describe("uri", () => {
    const collectionName = "test";
    const zIndex = 1;

    const partInfo = {
      collectionType: partType(collectionName),
      title: "testTitle",
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
      await davaOfficial.createPartType(
        collectionName,
        background.tokenId,
        foreground.tokenId,
        zIndex
      );
      tokenId = await (await davaOfficial.numberOfParts()).toNumber();
      await davaOfficial.createPart(
        partInfo.collectionType,
        partInfo.title,
        partInfo.description,
        partInfo.uri,
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
          createImage([background.url, partInfo.uri, foreground.url]),
        imageUri: createImageUri({
          host: "https://api.davaproject.com",
          layers: [
            { address: davaOfficialAddress, tokenId: background.tokenId },
            { address: davaOfficialAddress, tokenId },
            { address: davaOfficialAddress, tokenId: foreground.tokenId },
          ],
        }),
        collection: davaOfficial.address,
        tokenId: `${tokenId}`,
        maxSupply: partInfo.maxSupply.toString(),
        type: collectionName,
        host,
      });

      const result = await davaOfficial.uri(tokenId);
      expect(result).to.equal(expectedResult);
    });
  });
});
