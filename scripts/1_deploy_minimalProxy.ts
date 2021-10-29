import { ethers } from "hardhat";
import { HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import { MinimalProxy__factory } from "../types";

const network = getNetwork();
const id = 1;

const run: HardhatScript = async () => {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Start deploying <MinimalProxy>");
  const MinimalProxyContract = new MinimalProxy__factory(deployer);
  const minimalProxy = await MinimalProxyContract.deploy();
  await minimalProxy.deployed();
  console.log("<MinimalProxy> Contract deployed at:", minimalProxy.address);

  return {
    deployedContract: {
      contractName: "MinimalProxy",
      address: minimalProxy.address,
    },
  };
};

main(network, id, run)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
