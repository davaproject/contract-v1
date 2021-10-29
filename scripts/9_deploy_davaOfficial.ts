import { ethers } from "hardhat";
import { HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import data from "./data.json";
import { DavaOfficial__factory } from "../types";

const network = getNetwork();
const id = 9;

const run: HardhatScript = async () => {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Start deploying <DavaOfficial>");
  const DavaOfficial = new DavaOfficial__factory(deployer);
  const davaOfficial = await DavaOfficial.deploy(data.imgServerHost);
  await davaOfficial.deployed();
  console.log("<DavaOfficial> Contract deployed at:", davaOfficial.address);

  return {
    deployedContract: {
      contractName: "DavaOfficial",
      address: davaOfficial.address,
    },
  };
};

main(network, id, run)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
