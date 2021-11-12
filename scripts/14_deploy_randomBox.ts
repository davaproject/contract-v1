import { ethers } from "hardhat";
import { HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import { RandomBox__factory } from "../types";

const network = getNetwork();
const id = 14;

const run: HardhatScript = async () => {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Start deploying <RandomBox>");
  const RandomBox = new RandomBox__factory(deployer);
  const randomBox = await RandomBox.deploy();
  await randomBox.deployed();
  console.log("<RandomBox> Contract deployed at:", randomBox.address);

  return {
    deployedContract: {
      contractName: "RandomBox",
      address: randomBox.address,
    },
  };
};

main(network, id, run)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
