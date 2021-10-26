import { ethers } from "hardhat";
import { DeployedContract, HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import { getDeployed } from "./utils/deploy-log";
import { Contract } from "@ethersproject/contracts";

const network = getNetwork();
const id = 21;

const grantMinterRole = async ({
  asset,
  operator,
}: {
  asset: Contract;
  operator: string;
}): Promise<void> => {
  console.log(`Grant MINTER_ROLE to <${operator}> in <${asset.address}>`);
  const MINTER_ROLE = await asset.MINTER_ROLE();
  const tx = await asset.grantRole(MINTER_ROLE, operator);
  await tx.wait(1);
  console.log(`MINTER_ROLE is granted to <${operator}> in <${asset.address}>`);
};

const run: HardhatScript = async (): Promise<DeployedContract | undefined> => {
  const [deployer] = await ethers.getSigners();
  console.log("Interacting contracts with the account:", deployer.address);

  const assetDrop = getDeployed(network, "AssetDrop");
  if (!assetDrop) {
    throw Error("<AssetDrop> is not deployed yet");
  }

  const assetTitleList = [
    "DavaBackground",
    "DavaEmotion",
    "DavaHelmet",
    "DavaHelmetAddOn",
    "DavaSuit",
    "DavaSuitAddOn",
  ];
  const assets: Array<Contract> = await Promise.all(
    assetTitleList.map(async (assetTitle) => {
      const assetAddress = getDeployed(network, assetTitle);
      if (!assetAddress) {
        throw Error(`${assetTitle} is not deployed yet`);
      }

      const AssetBase = await ethers.getContractFactory(
        "contracts/libraries/AssetBase.sol/AssetBase"
      );
      const asset = await AssetBase.attach(assetAddress);
      return asset;
    })
  );

  await assets.reduce(
    (acc, asset) =>
      acc.then(() => grantMinterRole({ asset, operator: assetDrop })),
    Promise.resolve()
  );

  return;
};

main(network, id, run)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
