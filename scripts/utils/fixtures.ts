import { ContractTransaction } from "@ethersproject/contracts";
import { ethers } from "hardhat";
import {
  AvatarV1,
  AvatarV1__factory,
  Dava,
  DavaOfficial,
  DavaOfficial__factory,
  DavaFrame,
  DavaFrame__factory,
  Dava__factory,
  MinimalProxy,
  MinimalProxy__factory,
  RandomBox,
  RandomBox__factory,
  Sale,
  Sale__factory,
  GatewayHandler__factory,
  GatewayHandler,
} from "../../types";
import data from "../../data.json";

export type Parts = {
  defaultPart: {
    background: {
      tokenId: number;
      ipfsHash: string;
    };
    foreground: {
      tokenId: number;
      ipfsHash: string;
    };
  };
  host: string;
};

export type Contracts = {
  gatewayHandler: GatewayHandler;
  minimalProxy: MinimalProxy;
  dava: Dava;
  avatarV1: AvatarV1;
  parts: {
    davaOfficial: DavaOfficial;
    davaFrame: DavaFrame;
  };
  sale: Sale;
  randomBox: RandomBox;
};

export type Fixture = {
  contracts: Contracts;
  parts: Parts;
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

const registerFrameCollection = async ({
  dava,
  collection,
}: {
  dava: Dava;
  collection: string;
}): Promise<void> => {
  const tx = await dava.registerFrameCollection(collection);
  await tx.wait(1);
};

const host = "https://api.davaproject.com";
export const fixtures = async (): Promise<Fixture> => {
  let tx: ContractTransaction;

  const [deployer] = await ethers.getSigners();
  // "Deploying contracts with the account

  // Start deploying <GatewayHandler>
  const GatewayHandlerContract = new GatewayHandler__factory(deployer);
  const gatewayHandler = await GatewayHandlerContract.deploy();
  await gatewayHandler.deployed();

  // Start registering gateways
  await Object.values(data.gatewayHandler).reduce(
    (acc, { key, gateway }) =>
      acc.then(async () => {
        const tx = await gatewayHandler.setGateway(key, gateway);
        await tx.wait(1);
      }),
    Promise.resolve()
  );

  // Start deploying <MinimalProxy>
  const MinimalProxyContract = new MinimalProxy__factory(deployer);
  const minimalProxy = await MinimalProxyContract.deploy();
  await minimalProxy.deployed();

  // Start deploying <Dava>
  const DavaContract = new Dava__factory(deployer);
  const dava = await DavaContract.deploy(
    minimalProxy.address,
    gatewayHandler.address
  );
  await dava.deployed();

  // Start deploying <AvatarV1>
  const AvatarV1Contract = new AvatarV1__factory(deployer);
  const avatarV1 = await AvatarV1Contract.deploy();
  await avatarV1.deployed();

  // Start upgrading <Dava> with <AvatarV1>
  tx = await dava.connect(deployer).upgradeTo(avatarV1.address);
  await tx.wait(1);
  // Finish upgrading <Dava> with <AvatarV1>

  // Start deploying <DavaFrame>
  const DavaFrameContract = new DavaFrame__factory(deployer);
  const davaFrame = await DavaFrameContract.deploy(gatewayHandler.address);
  await davaFrame.deployed();
  await registerFrameCollection({
    dava,
    collection: davaFrame.address,
  });

  // Start registering frames into <DavaFrame>
  await Object.values(data.frames).reduce(
    (acc, { image, zIndex }) =>
      acc.then(async () => {
        await davaFrame.registerFrame(image, zIndex);
      }),
    Promise.resolve()
  );

  // Start deploying <DavaOfficial>
  const DavaOfficialContract = new DavaOfficial__factory(deployer);
  const davaOfficial = await DavaOfficialContract.deploy(
    gatewayHandler.address,
    dava.address
  );
  await davaOfficial.deployed();
  await registerCollection({ dava, collection: davaOfficial.address });

  // Setup default part
  const defaultCategory = await davaOfficial.DEFAULT_CATEGORY();

  const background = {
    tokenId: await (await davaOfficial.numberOfParts()).toNumber(),
    ipfsHash: "background.png",
  };
  await davaOfficial.createPart(
    defaultCategory,
    "frame",
    "",
    background.ipfsHash,
    [],
    0
  );
  const foreground = {
    tokenId: await (await davaOfficial.numberOfParts()).toNumber(),
    ipfsHash: "foreground.png",
  };
  await davaOfficial.createPart(
    defaultCategory,
    "frame",
    "",
    foreground.ipfsHash,
    [],
    0
  );

  // Start deploying <RandomBox>
  const RandomBoxContract = new RandomBox__factory(deployer);
  const randomBox = await RandomBoxContract.deploy();
  await randomBox.deployed();

  // Start deploying <Sale>
  const SaleContract = new Sale__factory(deployer);
  const now = (await ethers.provider.getBlock("latest")).timestamp;
  const preStart = now + 1000;
  const preEnd = now + 2000;
  const publicStart = now + 3000;
  const sale = await SaleContract.deploy(
    dava.address,
    davaOfficial.address,
    randomBox.address,
    preStart,
    preEnd,
    publicStart
  );
  await sale.deployed();

  // Grant MINTER_ROLE to <Sale> contract
  const MINTER_ROLE = await dava.MINTER_ROLE();
  tx = await dava.grantRole(MINTER_ROLE, sale.address);
  await tx.wait(1);

  return {
    contracts: {
      gatewayHandler,
      minimalProxy,
      dava,
      avatarV1,
      parts: {
        davaOfficial,
        davaFrame,
      },
      sale,
      randomBox,
    },
    parts: {
      defaultPart: {
        background,
        foreground,
      },
      host,
    },
  };
};
