import { ContractTransaction } from "@ethersproject/contracts";
import { ethers } from "hardhat";
import {
  AssetBase,
  AssetDrop,
  AssetDrop__factory,
  AvatarV1,
  AvatarV1__factory,
  Dava,
  DavaBackground,
  DavaBackground__factory,
  DavaEmotion,
  DavaEmotion__factory,
  DavaFrameBackground,
  DavaFrameBackground__factory,
  DavaFrameBody,
  DavaFrameBody__factory,
  DavaFrameHead,
  DavaFrameHead__factory,
  DavaHelmet,
  DavaHelmetAddOn,
  DavaHelmetAddOn__factory,
  DavaHelmet__factory,
  DavaSignature,
  DavaSignature__factory,
  DavaSuit,
  DavaSuitAddOn,
  DavaSuitAddOn__factory,
  DavaSuit__factory,
  Dava__factory,
  MinimalProxy,
  MinimalProxy__factory,
  RandomBox,
  RandomBox__factory,
  Sale,
  Sale__factory,
} from "../../types";
import data from "../data.json";

type Fixture = {
  minimalProxy: MinimalProxy;
  dava: Dava;
  avatarV1: AvatarV1;
  assets: {
    // Dummy Assets (for mannequin)
    davaFrameBackground: DavaFrameBackground;
    davaFrameBody: DavaFrameBody;
    davaFrameHead: DavaFrameHead;
    davaSignature: DavaSignature;

    // Real Assets
    davaBackground: DavaBackground;
    davaEmotion: DavaEmotion;
    davaHelmet: DavaHelmet;
    davaHelmetAddOn: DavaHelmetAddOn;
    davaSuit: DavaSuit;
    davaSuitAddOn: DavaSuitAddOn;
  };
  sale: Sale;
  randomBox: RandomBox;
  assetDrop: AssetDrop;
};

const registerAsset = async ({
  dava,
  asset,
}: {
  dava: Dava;
  asset: string;
}): Promise<void> => {
  console.log(`Start register asset <${asset}> to <Dava>`);
  const tx = await dava.registerAsset(asset);
  await tx.wait(1);
  console.log(`asset <${asset}> contract is registered in <Dava>`);
};

const grantMinterRole = async ({
  asset,
  operator,
}: {
  asset: AssetBase;
  operator: string;
}): Promise<void> => {
  console.log(`Grant MINTER_ROLE to <${operator}> in <${asset.address}>`);
  const MINTER_ROLE = await asset.MINTER_ROLE();
  const tx = await asset.grantRole(MINTER_ROLE, operator);
  await tx.wait(1);
  console.log(`MINTER_ROLE is granted to <${operator}> in <${asset.address}>`);
};

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
  const dava = await DavaContract.deploy(minimalProxy.address);
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
    data.images.default.frameBackground
  );
  await davaFrameBackground.deployed();
  await registerAsset({ dava, asset: davaFrameBackground.address });

  // Start deploying <DavaFrameBody>
  const DavaFrameBodyContract = new DavaFrameBody__factory(deployer);
  const davaFrameBody = await DavaFrameBodyContract.deploy(
    data.images.default.frameBody
  );
  await davaFrameBody.deployed();
  await registerAsset({ dava, asset: davaFrameBody.address });

  // Start deploying <DavaFrameHead>
  const DavaFrameHeadContract = new DavaFrameHead__factory(deployer);
  const davaFrameHead = await DavaFrameHeadContract.deploy(
    data.images.default.frameHead
  );
  await davaFrameHead.deployed();
  await registerAsset({ dava, asset: davaFrameHead.address });

  // Start deploying <DavaSignature>
  const DavaSignatureContract = new DavaSignature__factory(deployer);
  const davaSignature = await DavaSignatureContract.deploy(
    data.images.default.signature
  );
  await davaSignature.deployed();
  await registerAsset({ dava, asset: davaSignature.address });

  // Start deploying <DavaBackground>
  const DavaBackgroundContract = new DavaBackground__factory(deployer);
  const davaBackground = await DavaBackgroundContract.deploy(
    data.images.default.emptyBackground,
    data.images.default.emptyHeadBody
  );
  await davaBackground.deployed();
  await registerAsset({ dava, asset: davaBackground.address });

  // Start deploying <DavaEmotion>
  const DavaEmotionContract = new DavaEmotion__factory(deployer);
  const davaEmotion = await DavaEmotionContract.deploy(
    data.images.default.emptyHeadBodyBackground,
    ""
  );
  await davaEmotion.deployed();
  await registerAsset({ dava, asset: davaEmotion.address });

  // Start deploying <DavaHelmet>
  const DavaHelmetContract = new DavaHelmet__factory(deployer);
  const davaHelmet = await DavaHelmetContract.deploy(
    data.images.default.emptyHeadBodyBackground,
    ""
  );
  await davaHelmet.deployed();
  await registerAsset({ dava, asset: davaHelmet.address });

  // Start deploying <DavaHelmetAddon>
  const DavaHelmetAddOnContract = new DavaHelmetAddOn__factory(deployer);
  const davaHelmetAddOn = await DavaHelmetAddOnContract.deploy(
    data.images.default.emptyHeadBodyBackground,
    ""
  );
  await davaHelmetAddOn.deployed();
  await registerAsset({ dava, asset: davaHelmetAddOn.address });

  // Start deploying <DavaSuit>
  const DavaSuitContract = new DavaSuit__factory(deployer);
  const davaSuit = await DavaSuitContract.deploy(
    data.images.default.emptyBodyBackground,
    data.images.default.emptyHead
  );
  await davaSuit.deployed();
  await registerAsset({ dava, asset: davaSuit.address });

  // Start deploying <DavaSuitAddOn>
  const DavaSuitAddOnContract = new DavaSuitAddOn__factory(deployer);
  const davaSuitAddOn = await DavaSuitAddOnContract.deploy(
    data.images.default.emptyBodyBackground,
    data.images.default.emptyHead
  );
  await davaSuitAddOn.deployed();
  await registerAsset({ dava, asset: davaSuitAddOn.address });

  // Start deploying <Sale>
  const SaleContract = new Sale__factory(deployer);
  const sale = await SaleContract.deploy(dava.address);
  await sale.deployed();

  // Grant MINTER_ROLE to <Sale> contract
  const MINTER_ROLE = await dava.MINTER_ROLE();
  tx = await dava.grantRole(MINTER_ROLE, sale.address);
  await tx.wait(1);

  // Start deploying <RandomBox>
  const RandomBoxContract = new RandomBox__factory(deployer);
  const randomBox = await RandomBoxContract.deploy();
  await randomBox.deployed();

  // Start deploying <AssetDrop>
  const assets = [
    davaBackground,
    davaEmotion,
    davaHelmet,
    davaHelmetAddOn,
    davaSuit,
    davaSuitAddOn,
  ];
  const AssetDropContract = new AssetDrop__factory(deployer);
  const assetDrop = await AssetDropContract.deploy(
    dava.address,
    assets.map(({ address }) => address),
    randomBox.address
  );
  await assetDrop.deployed();

  // Grant MINTER_ROLE to <AssetDrop>
  await assets.reduce(
    (acc, asset) =>
      acc.then(() => grantMinterRole({ asset, operator: assetDrop.address })),
    Promise.resolve()
  );

  // Grant OPERATOR_ROLE to <AssetDrop>
  const OPERATOR_ROLE = await randomBox.OPERATOR_ROLE();
  tx = await randomBox.grantRole(OPERATOR_ROLE, assetDrop.address);
  await tx.wait(1);

  return {
    minimalProxy,
    dava,
    avatarV1,
    assets: {
      // Dummy Assets (for mannequin)
      davaFrameBackground,
      davaFrameBody,
      davaFrameHead,
      davaSignature,

      // Real Assets
      davaBackground,
      davaEmotion,
      davaHelmet,
      davaHelmetAddOn,
      davaSuit,
      davaSuitAddOn,
    },
    sale,
    randomBox,
    assetDrop,
  };
};
