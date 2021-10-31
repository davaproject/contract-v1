import { ContractTransaction } from "@ethersproject/contracts";
import { ethers } from "hardhat";
import {
  AvatarV1,
  AvatarV1__factory,
  Dava,
  DavaOfficial,
  DavaOfficial__factory,
  DavaFrameBackground,
  DavaFrameBackground__factory,
  DavaFrameBody,
  DavaFrameBody__factory,
  DavaFrameHead,
  DavaFrameHead__factory,
  DavaSignature,
  DavaSignature__factory,
  Dava__factory,
  MinimalProxy,
  MinimalProxy__factory,
  RandomBox,
  RandomBox__factory,
  Sale,
  Sale__factory,
} from "../../types";
import data from "../data.json";

export type Assets = {
  defaultAsset: {
    background: {
      tokenId: number;
      url: string;
    };
    foreground: {
      tokenId: number;
      url: string;
    };
  };
  host: string;
};

export type Contracts = {
  minimalProxy: MinimalProxy;
  dava: Dava;
  avatarV1: AvatarV1;
  assets: {
    davaOfficial: DavaOfficial;

    // Dummy Assets (for mannequin)
    davaFrameBackground: DavaFrameBackground;
    davaFrameBody: DavaFrameBody;
    davaFrameHead: DavaFrameHead;
    davaSignature: DavaSignature;
  };
  sale: Sale;
  randomBox: RandomBox;
};

export type Fixture = {
  contracts: Contracts;
  assets: Assets;
};

const registerCollection = async ({
  dava,
  collection,
}: {
  dava: Dava;
  collection: string;
}): Promise<void> => {
  const tx = await dava.registerCollection(collection);
  await tx.wait(1);
};

const registerDefaultCollection = async ({
  dava,
  collection,
}: {
  dava: Dava;
  collection: string;
}): Promise<void> => {
  const tx = await dava.registerDefaultCollection(collection);
  await tx.wait(1);
};

const host = "https://api.davaproject.com";
export const fixtures = async (): Promise<Fixture> => {
  let tx: ContractTransaction;

  const [deployer] = await ethers.getSigners();
  // "Deploying contracts with the account

  // Start deploying <MinimalProxy>
  const MinimalProxyContract = new MinimalProxy__factory(deployer);
  const minimalProxy = await MinimalProxyContract.deploy();
  await minimalProxy.deployed();

  // Start deploying <Dava>
  const DavaContract = new Dava__factory(deployer);
  const dava = await DavaContract.deploy(minimalProxy.address, host);
  await dava.deployed();

  // Start deploying <AvatarV1>
  const AvatarV1Contract = new AvatarV1__factory(deployer);
  const avatarV1 = await AvatarV1Contract.deploy();
  await avatarV1.deployed();

  // Start upgrading <Dava> with <AvatarV1>
  tx = await dava.connect(deployer).upgradeTo(avatarV1.address);
  await tx.wait(1);
  // Finish upgrading <Dava> with <AvatarV1>

  // Start deploying <DavaFrameBackground>
  const DavaFrameBackgroundContract = new DavaFrameBackground__factory(
    deployer
  );
  const davaFrameBackground = await DavaFrameBackgroundContract.deploy(
    data.images.frames.frameBackground
  );
  await davaFrameBackground.deployed();
  await registerDefaultCollection({
    dava,
    collection: davaFrameBackground.address,
  });

  // Start deploying <DavaFrameBody>
  const DavaFrameBodyContract = new DavaFrameBody__factory(deployer);
  const davaFrameBody = await DavaFrameBodyContract.deploy(
    data.images.frames.frameBody
  );
  await davaFrameBody.deployed();
  await registerDefaultCollection({ dava, collection: davaFrameBody.address });

  // Start deploying <DavaFrameHead>
  const DavaFrameHeadContract = new DavaFrameHead__factory(deployer);
  const davaFrameHead = await DavaFrameHeadContract.deploy(
    data.images.frames.frameHead
  );
  await davaFrameHead.deployed();
  await registerDefaultCollection({ dava, collection: davaFrameHead.address });

  // Start deploying <DavaSignature>
  const DavaSignatureContract = new DavaSignature__factory(deployer);
  const davaSignature = await DavaSignatureContract.deploy(
    data.images.frames.signature
  );
  await davaSignature.deployed();
  await registerDefaultCollection({ dava, collection: davaSignature.address });

  // Start deploying <DavaOfficial>
  const DavaOfficialContract = new DavaOfficial__factory(deployer);
  const davaOfficial = await DavaOfficialContract.deploy(host, dava.address);
  await davaOfficial.deployed();
  await registerCollection({ dava, collection: davaOfficial.address });

  // Setup default assets
  const defaultAssetType = await davaOfficial.DEFAULT_ASSET_TYPE();

  const background = {
    tokenId: await (await davaOfficial.numberOfAssets()).toNumber(),
    url: "https://ipfs.io/background.png",
  };
  await davaOfficial.createAsset(
    defaultAssetType,
    "frame",
    ethers.constants.AddressZero,
    "",
    background.url,
    [],
    0
  );
  const foreground = {
    tokenId: await (await davaOfficial.numberOfAssets()).toNumber(),
    url: "https://ipfs.io/foreground.png",
  };
  await davaOfficial.createAsset(
    defaultAssetType,
    "frame",
    ethers.constants.AddressZero,
    "",
    foreground.url,
    [],
    0
  );

  // Start deploying <Sale>
  const SaleContract = new Sale__factory(deployer);
  const now = (await ethers.provider.getBlock("latest")).timestamp;
  const preStart = now + 1000;
  const preEnd = now + 2000;
  const publicStart = now + 3000;
  const sale = await SaleContract.deploy(
    dava.address,
    preStart,
    preEnd,
    publicStart
  );
  await sale.deployed();

  // Grant MINTER_ROLE to <Sale> contract
  const MINTER_ROLE = await dava.MINTER_ROLE();
  tx = await dava.grantRole(MINTER_ROLE, sale.address);
  await tx.wait(1);

  // Start deploying <RandomBox>
  const RandomBoxContract = new RandomBox__factory(deployer);
  const randomBox = await RandomBoxContract.deploy();
  await randomBox.deployed();

  return {
    contracts: {
      minimalProxy,
      dava,
      avatarV1,
      assets: {
        davaOfficial,

        // Dummy Assets (for mannequin)
        davaFrameBackground,
        davaFrameBody,
        davaFrameHead,
        davaSignature,

        // Real Assets
      },
      sale,
      randomBox,
    },
    assets: {
      defaultAsset: {
        background,
        foreground,
      },
      host,
    },
  };
};
