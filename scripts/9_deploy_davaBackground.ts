import { ethers } from "hardhat";
import { DeployedContract, HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import data from "./data.json";
import { DavaBackground__factory } from "../types";

const network = getNetwork();
const id = 9;

const run: HardhatScript = async (): Promise<DeployedContract | undefined> => {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Start deploying <DavaBackground>");
  const DavaBackground = new DavaBackground__factory(deployer);
  const davaBackground = await DavaBackground.deploy(
    data.images.default.emptyBackground,
    data.images.default.emptyHeadBody
  );
  await davaBackground.deployed();
  console.log("<DavaBackground> Contract deployed at:", davaBackground.address);

  return {
    contractName: "DavaBackground",
    address: davaBackground.address,
  };
};

main(network, id, run)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
