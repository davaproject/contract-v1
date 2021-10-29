import { ethers } from "hardhat";
import { HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import { getDeployed } from "./utils/deploy-log";
import { Dava__factory } from "../types";
import data from "./data.json";

const network = getNetwork();
const id = 2;

const run: HardhatScript = async () => {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const minimalProxy = getDeployed(network, "MinimalProxy");
  if (!minimalProxy) {
    throw Error("MinimalProxy is not deployed yet");
  }

  console.log("Start deploying <Dava>");
  const DavaContract = new Dava__factory(deployer);
  const dava = await DavaContract.deploy(minimalProxy, data.imgServerHost);
  await dava.deployed();
  console.log("<Dava> Contract deployed at:", dava.address);

  return {
    deployedContract: {
      contractName: "Dava",
      address: dava.address,
    },
  };
};

main(network, id, run)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
