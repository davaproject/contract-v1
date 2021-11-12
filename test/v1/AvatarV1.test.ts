import chai from "chai";

import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  AvatarV1,
  AvatarV1__factory,
  Dava,
  DavaFrame,
  DavaOfficial,
} from "../../types";
import { solidity } from "ethereum-waffle";
import { fixtures } from "../../scripts/utils/fixtures";
import { parseEther } from "@ethersproject/units";
import { createImage, createImageUri } from "./utils/image";
import { categoryId } from "./utils/part";
import { checkChange } from "./utils/compare";
import data from "../../data.json";
import { generateAvatarMetadataString } from "./utils/metadata";

chai.use(solidity);
const { expect } = chai;

describe("Avatar", () => {
  let snapshot: string;
  let dava: Dava;
  let mintedAvatarId: number;
  let mintedAvatar: AvatarV1;
  let avatarOwner: SignerWithAddress;
  let [deployer, ...accounts]: SignerWithAddress[] = [];

  let davaOfficial: DavaOfficial;
  let davaFrame: DavaFrame;

  let gateway = data.gatewayHandler.ipfsGateway.gateway;
  let host: string;
  let background: { tokenId: number; ipfsHash: string };
  let foreground: { tokenId: number; ipfsHash: string };

  before(async () => {
    [deployer, ...accounts] = await ethers.getSigners();
    const { contracts, parts } = await fixtures();

    dava = contracts.dava;
    avatarOwner = accounts[0];
    mintedAvatarId = 0;
    await dava.connect(deployer).mint(avatarOwner.address, mintedAvatarId);
    mintedAvatar = AvatarV1__factory.connect(
      await dava.getAvatar(mintedAvatarId),
      accounts[0]
    );

    ({ host } = parts);
    ({ background, foreground } = parts.defaultPart);
    ({ davaOfficial, davaFrame } = contracts.parts);
  });

  beforeEach(async () => {
    snapshot = await ethers.provider.send("evm_snapshot", []);
  });

  afterEach(async () => {
    await ethers.provider.send("evm_revert", [snapshot]);
  });

  describe("owner", () => {
    it("should return DAVA token owner", async () => {
      const ownerOfDava = await dava.ownerOf(mintedAvatarId);
      const ownerOfAvatar = await mintedAvatar.owner();

      expect(ownerOfDava).to.equal(ownerOfAvatar);
    });
  });

  describe("dava", () => {
    it("should return DAVA address", async () => {
      const result = await mintedAvatar.dava();
      expect(result).to.equal(dava.address);
    });
  });

  describe("part", () => {
    const name = "test";
    const registeredCategory = categoryId(name);
    let partId: number;
    let partOwner: SignerWithAddress;
    before(async () => {
      partOwner = accounts[3];

      await davaOfficial.createCategory(name, 0, 0, 0);
      partId = (await davaOfficial.numberOfParts()).toNumber();
      await davaOfficial.createPart(registeredCategory, "test", "", "", [], 1);
      await dava.registerCategory(registeredCategory);
      await davaOfficial.mint(partOwner.address, partId, 1, "0x");
    });

    it("should return empty part if not put on", async () => {
      const result = await mintedAvatar.part(registeredCategory);
      expect(result.collection).to.equal(ethers.constants.AddressZero);
      expect(result.id).to.equal(0);
    });

    it("should return proper part", async () => {
      await davaOfficial
        .connect(partOwner)
        .safeTransferFrom(
          partOwner.address,
          mintedAvatar.address,
          partId,
          1,
          "0x"
        );
      await mintedAvatar.dress(
        [{ collection: davaOfficial.address, id: partId }],
        []
      );
      const result = await mintedAvatar.part(registeredCategory);
      expect(result.collection).to.equal(davaOfficial.address);
      expect(result.id).to.equal(partId);
    });
  });

  describe("allParts", () => {
    const name = "test0987654321";
    const registeredCategory = categoryId(name);
    before(async () => {
      await davaOfficial.createCategory(name, 0, 0, 9999);
      const partId = await davaOfficial.numberOfParts();
      await davaOfficial.createPart(registeredCategory, "test", "", "", [], 1);
      await dava.registerCategory(registeredCategory);
      await davaOfficial.mint(mintedAvatar.address, partId, 1, "0x");
      await mintedAvatar.dress(
        [{ collection: davaOfficial.address, id: partId }],
        []
      );
    });

    after(async () => {
      await mintedAvatar.dress([], [registeredCategory]);
    });

    it("return all parts that avatar currently put on", async () => {
      await checkChange({
        status: async () => {
          const parts = await mintedAvatar.allParts();
          const putOnAmount = parts.filter(
            (v) => v[0] != ethers.constants.AddressZero
          ).length;
          return putOnAmount;
        },
        process: () => mintedAvatar.dress([], [registeredCategory]),
        expectedBefore: 1,
        expectedAfter: 0,
      });
    });
  });

  describe("receive()", () => {
    it("should allow receiving ETH", async () => {
      await accounts[0].sendTransaction({
        to: mintedAvatar.address,
        value: parseEther("1"),
      });
      expect(await ethers.provider.getBalance(mintedAvatar.address)).to.equal(
        parseEther("1")
      );
    });

    it("should be able to withdraw ETH", async () => {
      await accounts[0].sendTransaction({
        to: mintedAvatar.address,
        value: parseEther("1"),
      });
      expect(await ethers.provider.getBalance(mintedAvatar.address)).to.equal(
        parseEther("1")
      );
      const bal0 = await ethers.provider.getBalance(accounts[1].address);
      await mintedAvatar.connect(accounts[0]).execute({
        to: accounts[1].address,
        value: parseEther("1"),
        data: "0x",
      });
      expect(await ethers.provider.getBalance(accounts[1].address)).to.equal(
        bal0.add(parseEther("1"))
      );
      expect(await ethers.provider.getBalance(mintedAvatar.address)).to.equal(
        0
      );
    });
  });

  describe("getPFP & getMetaData", () => {
    describe("without part", () => {
      it("should return default pfp", async () => {
        const expectedPfp = createImage(
          Object.values(
            Object.values(data.frames).map(({ image }) => gateway + "/" + image)
          )
        );
        const pfp = await mintedAvatar.getPFP();

        expect(pfp).to.equal(expectedPfp);
      });

      it("should return default metadata", async () => {
        const expectedImageUri = createImageUri({
          host,
          layers: Object.keys(data.frames).map((_, i) => ({
            address: davaFrame.address.toLowerCase(),
            tokenId: i,
          })),
        });
        const expectedResult = generateAvatarMetadataString({
          name: `DAVA #${mintedAvatarId}`,
          description: `Genesis Avatar (${mintedAvatar.address.toLowerCase()})`,
          attributes: [],
          rawImage: "data:image/svg+xml;utf8," + (await mintedAvatar.getPFP()),
          imageUri: expectedImageUri,
          dava: dava.address,
          avatar: mintedAvatar.address,
          tokenId: `${mintedAvatarId}`,
          host,
        });

        const metadata = await mintedAvatar.getMetadata();
        expect(metadata).to.equal(expectedResult);
      });
    });

    describe("with parts", () => {
      let layers: Array<{
        tokenId: number;
        zIndex: number;
        ipfsHash: string;
        category: string;
        partTitle: string;
      }>;

      before(async () => {
        layers = [
          {
            tokenId: 0,
            zIndex: data.frames.background.zIndex - 1,
            ipfsHash: "layer0",
            category: "layer0",
            partTitle: "part0",
          },
          {
            tokenId: 0,
            zIndex: data.frames.background.zIndex + 1,
            ipfsHash: "layer1",
            category: "layer1",
            partTitle: "part1",
          },
          {
            tokenId: 0,
            zIndex: data.frames.body.zIndex + 1,
            ipfsHash: "layer2",
            category: "layer2",
            partTitle: "part2",
          },
          {
            tokenId: 0,
            zIndex: data.frames.head.zIndex + 1,
            ipfsHash: "layer3",
            category: "layer3",
            partTitle: "part3",
          },
        ];

        await layers.reduce(
          (acc, layer) =>
            acc.then(async () => {
              const { zIndex, ipfsHash, category } = layer;
              const title = category;
              const categoryId = ethers.utils.keccak256(
                ethers.utils.toUtf8Bytes(title)
              );
              await davaOfficial.createCategory(
                title,
                background.tokenId,
                foreground.tokenId,
                zIndex
              );
              await dava.registerCategory(categoryId);

              layer.tokenId = (await davaOfficial.numberOfParts()).toNumber();
              await davaOfficial.createPart(
                categoryId,
                layer.partTitle,
                "",
                ipfsHash,
                [],
                1
              );

              await davaOfficial.mint(
                mintedAvatar.address,
                layer.tokenId,
                1,
                []
              );

              // TODO: registered but not puton case
              await mintedAvatar.dress(
                [
                  {
                    collection: davaOfficial.address,
                    id: layer.tokenId,
                  },
                ],
                []
              );
            }),
          Promise.resolve()
        );
      });

      it("should return compiled pfp", async () => {
        const expectedPfp = createImage([
          gateway + "/" + layers[0].ipfsHash,
          gateway + "/" + data.frames.background.image,
          gateway + "/" + layers[1].ipfsHash,
          gateway + "/" + data.frames.body.image,
          gateway + "/" + layers[2].ipfsHash,
          gateway + "/" + data.frames.head.image,
          gateway + "/" + layers[3].ipfsHash,
        ]);
        const pfp = await mintedAvatar.getPFP();
        expect(pfp).to.equal(expectedPfp);
      });

      it("should return compiled metadata", async () => {
        const expectedImageUri = createImageUri({
          host,
          layers: [
            {
              address: davaOfficial.address.toLowerCase(),
              tokenId: layers[0].tokenId,
            },
            {
              address: davaFrame.address.toLowerCase(),
              tokenId: 0,
            },
            {
              address: davaOfficial.address.toLowerCase(),
              tokenId: layers[1].tokenId,
            },
            { address: davaFrame.address.toLowerCase(), tokenId: 1 },
            {
              address: davaOfficial.address.toLowerCase(),
              tokenId: layers[2].tokenId,
            },
            { address: davaFrame.address.toLowerCase(), tokenId: 2 },
            {
              address: davaOfficial.address.toLowerCase(),
              tokenId: layers[3].tokenId,
            },
          ],
        });
        const expectedResult = generateAvatarMetadataString({
          name: `DAVA #${mintedAvatarId}`,
          description: `Genesis Avatar (${mintedAvatar.address.toLowerCase()})`,
          attributes: [
            ...layers.map(({ category, partTitle }) => ({
              trait_type: category,
              value: partTitle,
            })),
          ],
          rawImage: "data:image/svg+xml;utf8," + (await mintedAvatar.getPFP()),
          imageUri: expectedImageUri,
          dava: dava.address,
          avatar: mintedAvatar.address,
          tokenId: `${mintedAvatarId}`,
          host,
        });

        const metadata = await mintedAvatar.getMetadata();
        expect(metadata).to.equal(expectedResult);
      });

      it("should return updated compiled metadata if avatar take off some", async () => {
        await mintedAvatar.dress(
          [],
          [categoryId(layers[0].category), categoryId(layers[3].category)]
        );
        const expectedImageUri = createImageUri({
          host,
          layers: [
            {
              address: davaFrame.address.toLowerCase(),
              tokenId: 0,
            },
            {
              address: davaOfficial.address.toLowerCase(),
              tokenId: layers[1].tokenId,
            },
            { address: davaFrame.address.toLowerCase(), tokenId: 1 },
            {
              address: davaOfficial.address.toLowerCase(),
              tokenId: layers[2].tokenId,
            },
            { address: davaFrame.address.toLowerCase(), tokenId: 2 },
          ],
        });
        const expectedResult = generateAvatarMetadataString({
          name: `DAVA #${mintedAvatarId}`,
          description: `Genesis Avatar (${mintedAvatar.address.toLowerCase()})`,
          attributes: [
            ...[layers[1], layers[2]].map(({ category, partTitle }) => ({
              trait_type: category,
              value: partTitle,
            })),
          ],
          rawImage: "data:image/svg+xml;utf8," + (await mintedAvatar.getPFP()),
          imageUri: expectedImageUri,
          dava: dava.address,
          avatar: mintedAvatar.address,
          tokenId: `${mintedAvatarId}`,
          host,
        });

        const metadata = await mintedAvatar.getMetadata();
        expect(metadata).to.equal(expectedResult);
      });
    });
  });

  describe("dress", () => {
    interface Part {
      category: string;
      id: number;
    }
    let parts: Part[] = [];

    before(async () => {
      await [null, null].reduce(
        (acc, _, i) =>
          acc.then(async () => {
            const category = `test${Date.now()}${i}`;
            await davaOfficial.createCategory(
              category,
              background.tokenId,
              foreground.tokenId,
              i + 1000
            );

            const _categoryId = categoryId(category);
            await dava.registerCategory(_categoryId);

            const partId = (await davaOfficial.numberOfParts()).toNumber();
            await davaOfficial.createPart(_categoryId, "", "", "", [], 10);

            parts.push({ category: _categoryId, id: partId });
          }),
        Promise.resolve()
      );
    });

    describe("should be reverted", () => {
      it("if non-owner tries to call", async () => {
        const nonOwner = accounts[2];
        expect(avatarOwner.address).not.to.equal(nonOwner.address);

        await expect(
          mintedAvatar.connect(nonOwner).dress([], [])
        ).to.be.revertedWith("Avatar: only owner or Dava can call this");
      });
    });

    it("should success but should not show part image if avatar does not hold the part", async () => {
      const targetPart = parts[0];
      await davaOfficial.mint(
        ethers.Wallet.createRandom().address,
        targetPart.id,
        1,
        "0x"
      );

      await checkChange({
        status: async () => {
          const equippedPart = await mintedAvatar.part(targetPart.category);

          return {
            collection: equippedPart.collection,
            id: equippedPart.id.toNumber(),
          };
        },
        process: () =>
          mintedAvatar.dress(
            [
              {
                collection: davaOfficial.address,
                id: targetPart.id,
              },
            ],
            []
          ),
        expectedBefore: {
          collection: ethers.constants.AddressZero,
          id: 0,
        },
        expectedAfter: {
          collection: ethers.constants.AddressZero,
          id: 0,
        },
      });
    });

    describe("should put on parts", () => {
      it("if avatar holds the part", async () => {
        const targetPart = parts[0];
        await davaOfficial.mint(mintedAvatar.address, targetPart.id, 1, "0x");

        await checkChange({
          status: async () => {
            const equippedPart = await mintedAvatar.part(targetPart.category);

            return {
              collection: equippedPart.collection,
              id: equippedPart.id.toNumber(),
            };
          },
          process: () =>
            mintedAvatar.dress(
              [
                {
                  collection: davaOfficial.address,
                  id: targetPart.id,
                },
              ],
              []
            ),
          expectedBefore: {
            collection: ethers.constants.AddressZero,
            id: 0,
          },
          expectedAfter: {
            collection: davaOfficial.address,
            id: targetPart.id,
          },
        });
      });
    });

    describe("should take off parts", () => {
      let targetPart: Part;
      before(async () => {
        targetPart = parts[0];
        await davaOfficial.mint(mintedAvatar.address, targetPart.id, 1, "0x");
        await mintedAvatar.dress(
          [
            {
              collection: davaOfficial.address,
              id: parts[0].id,
            },
          ],
          []
        );
      });

      it("if avatar puton already", async () => {
        await checkChange({
          status: async () => {
            const equippedPart = await mintedAvatar.part(targetPart.category);

            return {
              collection: equippedPart.collection,
              id: equippedPart.id.toNumber(),
            };
          },
          process: () => mintedAvatar.dress([], [targetPart.category]),
          expectedBefore: {
            collection: davaOfficial.address,
            id: targetPart.id,
          },
          expectedAfter: { collection: ethers.constants.AddressZero, id: 0 },
        });
      });
    });
  });
});
