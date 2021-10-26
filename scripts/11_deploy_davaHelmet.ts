import { ethers } from "hardhat";
import { DeployedContract, HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import data from "./data.json";
import { DavaHelmet__factory } from "../types";

const network = getNetwork();
const id = 11;

const run: HardhatScript = async (): Promise<DeployedContract | undefined> => {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Start deploying <DavaHelmet>");
  const DavaHelmet = new DavaHelmet__factory(deployer);
  const davaHelmet = await DavaHelmet.deploy(
    data.images.default.emptyHeadBodyBackground,
    ""
  );
  await davaHelmet.deployed();
  console.log("<DavaHelmet> Contract deployed at:", davaHelmet.address);

  return {
    contractName: "DavaHelmet",
    address: davaHelmet.address,
  };
};

main(network, id, run)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
