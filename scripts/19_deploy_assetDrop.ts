import { ethers } from "hardhat";
import { HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import { getDeployed } from "./utils/deploy-log";
import { AssetDrop__factory } from "../types";

const network = getNetwork();
const id = 19;

const run: HardhatScript = async () => {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Start deploying <AssetDrop>");
  const dava = getDeployed(network, "Dava");
  if (!dava) {
    throw Error("<Dava> is not deployed yet");
  }

  const randomBox = getDeployed(network, "RandomBox");
  if (!randomBox) {
    throw Error("<RandomBox> is not deployed yet");
  }

  const assetTitleList = [
    "DavaBackground",
    "DavaEmotion",
    "DavaHelmet",
    "DavaHelmetAddOn",
    "DavaSuit",
    "DavaSuitAddOn",
  ];
  const assets = await Promise.all(
    assetTitleList.map(async (assetTitle) => {
      const asset = getDeployed(network, assetTitle);
      if (!asset) {
        throw Error(`${assetTitle} is not deployed yet`);
      }
      return asset;
    })
  );

  const AssetDrop = new AssetDrop__factory(deployer);
  const assetDrop = await AssetDrop.deploy(dava, assets, randomBox);
  await assetDrop.deployed();
  console.log("<AssetDrop> Contract deployed at:", assetDrop.address);

  return {
    deployedContract: {
      contractName: "AssetDrop",
      address: assetDrop.address,
    },
  };
};

main(network, id, run)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
