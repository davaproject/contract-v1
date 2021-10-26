import { ethers } from "hardhat";
import { DeployedContract, HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import { getDeployed } from "./utils/deploy-log";
import { Contract } from "@ethersproject/contracts";

const network = getNetwork();
const id = 20;

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

  const assetDrop = await getDeployed(network, "AssetDrop");
  if (!assetDrop) {
    throw Error("<AssetDrop> is not deployed yet");
  }

  const randomBoxAddress = await getDeployed(network, "RandomBox");
  if (!randomBoxAddress) {
    throw Error("<RandomBox> is not deployed yet");
  }
  const RandomBox = await ethers.getContractFactory(
    "contracts/RandomBox.sol/RandomBox"
  );
  const randomBox = await RandomBox.attach(randomBoxAddress);

  console.log("Grant OPERATOR_ROLE to <AssetDrop>");
  const OPERATOR_ROLE = await randomBox.OPERATOR_ROLE();
  const tx = await randomBox.grantRole(OPERATOR_ROLE, assetDrop);
  await tx.wait(1);
  console.log("OPERATOR_ROLE is granted");

  return;
};

main(network, id, run)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
