import { ethers } from "hardhat";
import { HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import { DavaFrame__factory } from "../types";

const network = getNetwork();
const id = 5;

const run: HardhatScript = async () => {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Start deploying <DavaFrame>");
  const DavaFrame = new DavaFrame__factory(deployer);
  const davaFrame = await DavaFrame.deploy();
  await davaFrame.deployed();
  console.log("<DavaFrame> Contract deployed at:", davaFrame.address);

  return {
    deployedContract: {
      contractName: "DavaFrame",
      address: davaFrame.address,
    },
  };
};

main(network, id, run)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
