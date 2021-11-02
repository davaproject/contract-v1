import { ethers } from "hardhat";
import { HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import data from "./data.json";
import { DavaOfficial__factory } from "../types";
import { getDeployed } from "./utils/deploy-log";

const network = getNetwork();
const id = 9;

const run: HardhatScript = async () => {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const dava = getDeployed(network, "Dava");
  if (!dava) {
    throw Error("Dava is not deployed yet");
  }

  console.log("Start deploying <DavaOfficial>");
  const DavaOfficial = new DavaOfficial__factory(deployer);
  const davaOfficial = await DavaOfficial.deploy(data.baseURI, dava);
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
