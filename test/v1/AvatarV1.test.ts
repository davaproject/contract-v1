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
import { assetType } from "./utils/asset";
import { checkChange } from "./utils/compare";
import data from "../../data.json";

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

  let host: string;
  let background: { tokenId: number; url: string };
  let foreground: { tokenId: number; url: string };

  before(async () => {
    [deployer, ...accounts] = await ethers.getSigners();
    const { contracts, assets } = await fixtures();

    dava = contracts.dava;
    avatarOwner = accounts[0];
    mintedAvatarId = 0;
    await dava.connect(deployer).mint(avatarOwner.address, mintedAvatarId);
    mintedAvatar = AvatarV1__factory.connect(
      await dava.getAvatar(mintedAvatarId),
      accounts[0]
    );

    ({ host } = assets);
    ({ background, foreground } = assets.defaultAsset);
    ({ davaOfficial, davaFrame } = contracts.assets);
  });

  beforeEach(async () => {
    snapshot = await ethers.provider.send("evm_snapshot", []);
  });

  afterEach(async () => {
    await ethers.provider.send("evm_revert", [snapshot]);
  });

  describe("setName", () => {
    it("should set name", async () => {
      const name = "test";
      await checkChange({
        status: () => mintedAvatar.name(),
        process: () => mintedAvatar.setName(name),
        expectedBefore: `DAVA #${mintedAvatarId}`,
        expectedAfter: name,
      });
    });
  });

  describe("name", () => {
    it("should return name", async () => {
      const name = "test";
      await mintedAvatar.setName(name);

      const result = await mintedAvatar.name();
      expect(result).to.equal(name);
    });
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

  describe("asset", () => {
    const name = "test";
    const registeredAssetType = assetType(name);
    let assetId: number;
    let assetOwner: SignerWithAddress;
    before(async () => {
      assetOwner = accounts[3];

      await davaOfficial.createAssetType(name, 0, 0, 0);
      assetId = (await davaOfficial.numberOfAssets()).toNumber();
      await davaOfficial.createAsset(
        registeredAssetType,
        "test",
        ethers.constants.AddressZero,
        "",
        "",
        [],
        1
      );
      await dava.registerAssetType(registeredAssetType);
      await davaOfficial.mint(assetOwner.address, assetId, 1, "0x");
    });

    it("should return empty asset if not put on", async () => {
      const result = await mintedAvatar.asset(registeredAssetType);
      expect(result.assetAddr).to.equal(ethers.constants.AddressZero);
      expect(result.id).to.equal(0);
    });

    it("should return proper asset", async () => {
      await davaOfficial
        .connect(assetOwner)
        .safeTransferFrom(
          assetOwner.address,
          mintedAvatar.address,
          assetId,
          1,
          "0x"
        );
      await mintedAvatar.dress(
        [{ assetAddr: davaOfficial.address, id: assetId }],
        []
      );
      const result = await mintedAvatar.asset(registeredAssetType);
      expect(result.assetAddr).to.equal(davaOfficial.address);
      expect(result.id).to.equal(assetId);
    });
  });

  describe("allAssets", () => {
    const name = "test0987654321";
    const registeredAssetType = assetType(name);
    before(async () => {
      await davaOfficial.createAssetType(name, 0, 0, 9999);
      const assetId = await davaOfficial.numberOfAssets();
      await davaOfficial.createAsset(
        registeredAssetType,
        "test",
        ethers.constants.AddressZero,
        "",
        "",
        [],
        1
      );
      await dava.registerAssetType(registeredAssetType);
      await davaOfficial.mint(mintedAvatar.address, assetId, 1, "0x");
      await mintedAvatar.dress(
        [{ assetAddr: davaOfficial.address, id: assetId }],
        []
      );
    });

    after(async () => {
      await mintedAvatar.dress([], [registeredAssetType]);
    });

    it("return all assets that avatar currently put on", async () => {
      await checkChange({
        status: async () => {
          const assets = await mintedAvatar.allAssets();
          const putOnAmount = assets.filter(
            (v) => v[0] != ethers.constants.AddressZero
          ).length;
          return putOnAmount;
        },
        process: () => mintedAvatar.dress([], [registeredAssetType]),
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
    describe("without asset", () => {
      it("should return default pfp", async () => {
        const expectedPfp = createImage(
          Object.values(Object.values(data.frames).map(({ image }) => image))
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
        const expectedResult = {
          name: await mintedAvatar.name(),
          creator: ethers.constants.AddressZero,
          description: `Genesis Avatar (${mintedAvatar.address.toLowerCase()})`,
          attributes: [
            {
              trait_type: "Avatar",
              value: mintedAvatar.address.toLowerCase(),
            },
            {
              trait_type: "Info",
              value: `${host}/infos/${mintedAvatarId}`,
            },
          ],
          raw_image: "data:image/svg+xml;utf8," + (await mintedAvatar.getPFP()),
          image: expectedImageUri,
        };

        const metadata = await mintedAvatar.getMetadata();
        expect(metadata).to.equal(
          "data:application/json;utf8," + JSON.stringify(expectedResult)
        );
      });
    });

    describe("with assets", () => {
      let layers: Array<{
        tokenId: number;
        zIndex: number;
        uri: string;
        assetTypeTitle: string;
        assetTitle: string;
      }>;

      before(async () => {
        layers = [
          {
            tokenId: 0,
            zIndex: data.frames.background.zIndex - 1,
            uri: "https://davaproject.com/layer0",
            assetTypeTitle: "layer0",
            assetTitle: "asset0",
          },
          {
            tokenId: 0,
            zIndex: data.frames.background.zIndex + 1,
            uri: "https://davaproject.com/layer1",
            assetTypeTitle: "layer1",
            assetTitle: "asset1",
          },
          {
            tokenId: 0,
            zIndex: data.frames.body.zIndex + 1,
            uri: "https://davaproject.com/layer2",
            assetTypeTitle: "layer2",
            assetTitle: "asset2",
          },
          {
            tokenId: 0,
            zIndex: data.frames.head.zIndex + 1,
            uri: "https://davaproject.com/layer3",
            assetTypeTitle: "layer3",
            assetTitle: "asset3",
          },
          {
            tokenId: 0,
            zIndex: data.frames.signature.zIndex + 1,
            uri: "https://davaproject.com/layer4",
            assetTypeTitle: "layer4",
            assetTitle: "asset4",
          },
        ];

        await layers.reduce(
          (acc, layer) =>
            acc.then(async () => {
              const { zIndex, uri, assetTypeTitle, assetTitle } = layer;
              const name = assetTypeTitle;
              const assetType = ethers.utils.keccak256(
                ethers.utils.toUtf8Bytes(name)
              );
              await davaOfficial.createAssetType(
                name,
                background.tokenId,
                foreground.tokenId,
                zIndex
              );
              await dava.registerAssetType(assetType);

              layer.tokenId = (await davaOfficial.numberOfAssets()).toNumber();
              await davaOfficial.createAsset(
                assetType,
                assetTitle,
                ethers.constants.AddressZero,
                "",
                uri,
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
                    assetAddr: davaOfficial.address,
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
          layers[0].uri,
          data.frames.background.image,
          layers[1].uri,
          data.frames.body.image,
          layers[2].uri,
          data.frames.head.image,
          layers[3].uri,
          data.frames.signature.image,
          layers[4].uri,
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
            {
              address: davaFrame.address.toLowerCase(),
              tokenId: 3,
            },
            {
              address: davaOfficial.address.toLowerCase(),
              tokenId: layers[4].tokenId,
            },
          ],
        });
        const expectedResult = {
          name: await mintedAvatar.name(),
          creator: ethers.constants.AddressZero,
          description: `Genesis Avatar (${mintedAvatar.address.toLowerCase()})`,
          attributes: [
            ...layers.map(({ assetTypeTitle, assetTitle }) => ({
              trait_type: assetTypeTitle,
              value: assetTitle,
            })),
            {
              trait_type: "Avatar",
              value: mintedAvatar.address.toLowerCase(),
            },
            {
              trait_type: "Info",
              value: `${host}/infos/${mintedAvatarId}`,
            },
          ],
          raw_image: "data:image/svg+xml;utf8," + (await mintedAvatar.getPFP()),
          image: expectedImageUri,
        };

        const metadata = await mintedAvatar.getMetadata();
        expect(metadata).to.equal(
          "data:application/json;utf8," + JSON.stringify(expectedResult)
        );
      });

      it("should return updated compiled metadata if avatar take off some", async () => {
        await mintedAvatar.dress(
          [],
          [
            ethers.utils.keccak256(
              ethers.utils.toUtf8Bytes(layers[0].assetTypeTitle)
            ),
            ethers.utils.keccak256(
              ethers.utils.toUtf8Bytes(layers[3].assetTypeTitle)
            ),
          ]
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
            {
              address: davaFrame.address.toLowerCase(),
              tokenId: 3,
            },
            {
              address: davaOfficial.address.toLowerCase(),
              tokenId: layers[4].tokenId,
            },
          ],
        });
        const expectedResult = {
          name: await mintedAvatar.name(),
          creator: ethers.constants.AddressZero,
          description: `Genesis Avatar (${mintedAvatar.address.toLowerCase()})`,
          attributes: [
            ...[layers[1], layers[2], layers[4]].map(
              ({ assetTypeTitle, assetTitle }) => ({
                trait_type: assetTypeTitle,
                value: assetTitle,
              })
            ),
            {
              trait_type: "Avatar",
              value: mintedAvatar.address.toLowerCase(),
            },
            {
              trait_type: "Info",
              value: `${host}/infos/${mintedAvatarId}`,
            },
          ],
          raw_image: "data:image/svg+xml;utf8," + (await mintedAvatar.getPFP()),
          image: expectedImageUri,
        };

        const metadata = await mintedAvatar.getMetadata();
        expect(metadata).to.equal(
          "data:application/json;utf8," + JSON.stringify(expectedResult)
        );
      });
    });
  });

  describe("dress", () => {
    interface Asset {
      assetType: string;
      id: number;
    }
    let assets: Asset[] = [];

    before(async () => {
      await Promise.all(
        [null, null].map(async (_, i) => {
          const assetTypeTitle = `test${Date.now()}${i}`;
          await davaOfficial.createAssetType(
            assetTypeTitle,
            background.tokenId,
            foreground.tokenId,
            i + 1000
          );

          const _assetType = assetType(assetTypeTitle);
          await dava.registerAssetType(_assetType);

          const assetId = (await davaOfficial.numberOfAssets()).toNumber();
          await davaOfficial.createAsset(
            _assetType,
            `asset-${i}`,
            deployer.address,
            "",
            "",
            [],
            10
          );

          assets.push({ assetType: _assetType, id: assetId });
        })
      );
    });

    describe("should be reverted", () => {
      it("if non-owner tries to call", async () => {
        const nonOwner = accounts[2];
        expect(avatarOwner.address).not.to.equal(nonOwner.address);

        await expect(
          mintedAvatar.connect(nonOwner).dress([], [])
        ).to.be.revertedWith("Account: only owner can call");
      });
    });

    describe("should put on assets", () => {
      it("when avatarOwner hold asset but avatar does not", async () => {
        const targetAsset = assets[0];
        await davaOfficial.mint(avatarOwner.address, targetAsset.id, 1, "0x");

        await checkChange({
          status: async () => {
            const avatarOwnerBalance = (
              await davaOfficial.balanceOf(avatarOwner.address, targetAsset.id)
            ).toNumber();
            const avatarBalance = (
              await davaOfficial.balanceOf(mintedAvatar.address, targetAsset.id)
            ).toNumber();
            const equippedAsset = await mintedAvatar.asset(
              targetAsset.assetType
            );

            return {
              avatarOwnerBalance,
              avatarBalance,
              equippedAsset: {
                assetAddr: equippedAsset.assetAddr,
                id: equippedAsset.id.toNumber(),
              },
            };
          },
          process: () =>
            mintedAvatar.dress(
              [
                {
                  assetAddr: davaOfficial.address,
                  id: targetAsset.id,
                },
              ],
              []
            ),
          expectedBefore: {
            avatarOwnerBalance: 1,
            avatarBalance: 0,
            equippedAsset: {
              assetAddr: ethers.constants.AddressZero,
              id: 0,
            },
          },
          expectedAfter: {
            avatarOwnerBalance: 0,
            avatarBalance: 1,
            equippedAsset: {
              assetAddr: davaOfficial.address,
              id: targetAsset.id,
            },
          },
        });
      });

      it("when avatar holds it", async () => {
        const targetAsset = assets[0];
        await davaOfficial.mint(mintedAvatar.address, targetAsset.id, 1, "0x");

        await checkChange({
          status: async () => {
            const avatarOwnerBalance = (
              await davaOfficial.balanceOf(avatarOwner.address, targetAsset.id)
            ).toNumber();
            const avatarBalance = (
              await davaOfficial.balanceOf(mintedAvatar.address, targetAsset.id)
            ).toNumber();
            const equippedAsset = await mintedAvatar.asset(
              targetAsset.assetType
            );

            return {
              avatarOwnerBalance,
              avatarBalance,
              equippedAsset: {
                assetAddr: equippedAsset.assetAddr,
                id: equippedAsset.id.toNumber(),
              },
            };
          },
          process: () =>
            mintedAvatar.dress(
              [
                {
                  assetAddr: davaOfficial.address,
                  id: targetAsset.id,
                },
              ],
              []
            ),
          expectedBefore: {
            avatarOwnerBalance: 0,
            avatarBalance: 1,
            equippedAsset: {
              assetAddr: ethers.constants.AddressZero,
              id: 0,
            },
          },
          expectedAfter: {
            avatarOwnerBalance: 0,
            avatarBalance: 1,
            equippedAsset: {
              assetAddr: davaOfficial.address,
              id: targetAsset.id,
            },
          },
        });
      });
    });

    describe("should take off assets", () => {
      let targetAsset: Asset;
      before(async () => {
        targetAsset = assets[0];
        await davaOfficial.mint(mintedAvatar.address, targetAsset.id, 1, "0x");
        await mintedAvatar.dress(
          [
            {
              assetAddr: davaOfficial.address,
              id: assets[0].id,
            },
          ],
          []
        );
      });

      it("and transfer it to avatarOwner", async () => {
        await checkChange({
          status: async () => {
            const avatarOwnerBalance = (
              await davaOfficial.balanceOf(avatarOwner.address, targetAsset.id)
            ).toNumber();
            const avatarBalance = (
              await davaOfficial.balanceOf(mintedAvatar.address, targetAsset.id)
            ).toNumber();
            const equippedAsset = await mintedAvatar.asset(
              targetAsset.assetType
            );

            return {
              avatarOwnerBalance,
              avatarBalance,
              equippedAsset: {
                assetAddr: equippedAsset.assetAddr,
                id: equippedAsset.id.toNumber(),
              },
            };
          },
          process: () => mintedAvatar.dress([], [targetAsset.assetType]),
          expectedBefore: {
            avatarOwnerBalance: 0,
            avatarBalance: 1,
            equippedAsset: {
              assetAddr: davaOfficial.address,
              id: targetAsset.id,
            },
          },
          expectedAfter: {
            avatarOwnerBalance: 1,
            avatarBalance: 0,
            equippedAsset: {
              assetAddr: ethers.constants.AddressZero,
              id: 0,
            },
          },
        });
      });
    });
  });
});
