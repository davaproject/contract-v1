import chai from "chai";

import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { AvatarV1, AvatarV1__factory, Dava, DavaOfficial } from "../../types";
import { solidity } from "ethereum-waffle";
import { fixtures } from "../../scripts/utils/fixtures";
import { parseEther } from "@ethersproject/units";
import { createImage, createImageUri } from "./utils/image";

chai.use(solidity);
const { expect } = chai;

describe("Avatar", () => {
  let snapshot: string;
  let dava: Dava;
  let mintedAvatar: AvatarV1;
  let [deployer, ...accounts]: SignerWithAddress[] = [];

  let davaOfficial: DavaOfficial;

  let host: string;
  let background: { tokenId: number; url: string };
  let foreground: { tokenId: number; url: string };
  interface Asset {
    address: string;
    img: string;
    zIndex: number;
  }
  let defaultAssets: {
    background: Asset;
    body: Asset;
    head: Asset;
    signature: Asset;
  };

  before(async () => {
    [deployer, ...accounts] = await ethers.getSigners();
    const { contracts, assets } = await fixtures();

    dava = contracts.dava;
    await dava.connect(deployer).mint(accounts[0].address, 0);
    mintedAvatar = AvatarV1__factory.connect(
      await dava.getAvatar(0),
      accounts[0]
    );

    ({ host } = assets);
    ({ background, foreground } = assets.defaultAsset);
    ({ davaOfficial } = contracts.assets);
    defaultAssets = {
      background: {
        address: contracts.assets.davaFrameBackground.address,
        img: await contracts.assets.davaFrameBackground.defaultImage(),
        zIndex: await (
          await contracts.assets.davaFrameBackground.zIndex()
        ).toNumber(),
      },
      body: {
        address: contracts.assets.davaFrameBody.address,
        img: await contracts.assets.davaFrameBody.defaultImage(),
        zIndex: await (
          await contracts.assets.davaFrameBody.zIndex()
        ).toNumber(),
      },
      head: {
        address: contracts.assets.davaFrameHead.address,
        img: await contracts.assets.davaFrameHead.defaultImage(),
        zIndex: await (
          await contracts.assets.davaFrameHead.zIndex()
        ).toNumber(),
      },
      signature: {
        address: contracts.assets.davaSignature.address,
        img: await contracts.assets.davaSignature.defaultImage(),
        zIndex: await (
          await contracts.assets.davaSignature.zIndex()
        ).toNumber(),
      },
    };
  });

  beforeEach(async () => {
    snapshot = await ethers.provider.send("evm_snapshot", []);
  });

  afterEach(async () => {
    await ethers.provider.send("evm_revert", [snapshot]);
  });

  describe("receive()", () => {
    const tokenId = 0;
    beforeEach(async () => {});

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
          Object.values(Object.values(defaultAssets).map(({ img }) => img))
        );
        const pfp = await mintedAvatar.getPFP();

        expect(pfp).to.equal(expectedPfp);
      });

      it("should return default metadata", async () => {
        const expectedImageUri = createImageUri({
          host,
          layers: Object.values(defaultAssets).map(({ address }) => ({
            address: address.toLowerCase(),
            tokenId: 0,
          })),
        });
        const expectedResult = {
          name: await mintedAvatar.name(),
          creator: ethers.constants.AddressZero,
          description: "Genesis Avatar",
          attributes: [],
          image_data:
            "data:image/svg+xml;utf8," + (await mintedAvatar.getPFP()),
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
        collectionTitle: string;
        assetTitle: string;
      }>;

      before(async () => {
        layers = [
          {
            tokenId: 0,
            zIndex: defaultAssets.background.zIndex - 1,
            uri: "https://davaproject.com/layer0",
            collectionTitle: "layer0",
            assetTitle: "asset0",
          },
          {
            tokenId: 0,
            zIndex: defaultAssets.background.zIndex + 1,
            uri: "https://davaproject.com/layer1",
            collectionTitle: "layer1",
            assetTitle: "asset1",
          },
          {
            tokenId: 0,
            zIndex: defaultAssets.body.zIndex + 1,
            uri: "https://davaproject.com/layer2",
            collectionTitle: "layer2",
            assetTitle: "asset2",
          },
          {
            tokenId: 0,
            zIndex: defaultAssets.head.zIndex + 1,
            uri: "https://davaproject.com/layer3",
            collectionTitle: "layer3",
            assetTitle: "asset3",
          },
          {
            tokenId: 0,
            zIndex: defaultAssets.signature.zIndex + 1,
            uri: "https://davaproject.com/layer4",
            collectionTitle: "layer4",
            assetTitle: "asset4",
          },
        ];

        await layers.reduce(
          (acc, layer) =>
            acc.then(async () => {
              const { zIndex, uri, collectionTitle, assetTitle } = layer;
              const name = collectionTitle;
              const collectionType = ethers.utils.keccak256(
                ethers.utils.toUtf8Bytes(name)
              );
              await davaOfficial.createCollection(
                name,
                background.tokenId,
                foreground.tokenId,
                zIndex
              );
              await dava["registerAsset(address,bytes32)"](
                davaOfficial.address,
                collectionType
              );

              layer.tokenId = (await davaOfficial.numberOfAssets()).toNumber();
              await davaOfficial.createAsset(
                collectionType,
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
              await mintedAvatar.putOn([
                {
                  assetType: collectionType,
                  assetAddr: davaOfficial.address,
                  id: layer.tokenId,
                },
              ]);
            }),
          Promise.resolve()
        );
      });

      it("should return compiled pfp", async () => {
        const expectedPfp = createImage([
          layers[0].uri,
          defaultAssets.background.img,
          layers[1].uri,
          defaultAssets.body.img,
          layers[2].uri,
          defaultAssets.head.img,
          layers[3].uri,
          defaultAssets.signature.img,
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
              address: defaultAssets.background.address.toLowerCase(),
              tokenId: 0,
            },
            {
              address: davaOfficial.address.toLowerCase(),
              tokenId: layers[1].tokenId,
            },
            { address: defaultAssets.body.address.toLowerCase(), tokenId: 0 },
            {
              address: davaOfficial.address.toLowerCase(),
              tokenId: layers[2].tokenId,
            },
            { address: defaultAssets.head.address.toLowerCase(), tokenId: 0 },
            {
              address: davaOfficial.address.toLowerCase(),
              tokenId: layers[3].tokenId,
            },
            {
              address: defaultAssets.signature.address.toLowerCase(),
              tokenId: 0,
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
          description: "Genesis Avatar",
          attributes: layers.map(({ collectionTitle, assetTitle }) => ({
            trait_type: collectionTitle,
            value: assetTitle,
          })),
          image_data:
            "data:image/svg+xml;utf8," + (await mintedAvatar.getPFP()),
          image: expectedImageUri,
        };

        const metadata = await mintedAvatar.getMetadata();
        expect(metadata).to.equal(
          "data:application/json;utf8," + JSON.stringify(expectedResult)
        );
      });

      it("should return updated compiled metadata if avatar take off some", async () => {
        await mintedAvatar.takeOff([
          ethers.utils.keccak256(
            ethers.utils.toUtf8Bytes(layers[0].collectionTitle)
          ),
          ethers.utils.keccak256(
            ethers.utils.toUtf8Bytes(layers[3].collectionTitle)
          ),
        ]);
        const expectedImageUri = createImageUri({
          host,
          layers: [
            {
              address: defaultAssets.background.address.toLowerCase(),
              tokenId: 0,
            },
            {
              address: davaOfficial.address.toLowerCase(),
              tokenId: layers[1].tokenId,
            },
            { address: defaultAssets.body.address.toLowerCase(), tokenId: 0 },
            {
              address: davaOfficial.address.toLowerCase(),
              tokenId: layers[2].tokenId,
            },
            { address: defaultAssets.head.address.toLowerCase(), tokenId: 0 },
            {
              address: defaultAssets.signature.address.toLowerCase(),
              tokenId: 0,
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
          description: "Genesis Avatar",
          attributes: [layers[1], layers[2], layers[4]].map(
            ({ collectionTitle, assetTitle }) => ({
              trait_type: collectionTitle,
              value: assetTitle,
            })
          ),
          image_data:
            "data:image/svg+xml;utf8," + (await mintedAvatar.getPFP()),
          image: expectedImageUri,
        };

        const metadata = await mintedAvatar.getMetadata();
        expect(metadata).to.equal(
          "data:application/json;utf8," + JSON.stringify(expectedResult)
        );
      });
    });
  });
});
