import { ethers } from "hardhat";
import { HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import { Randomizer__factory } from "../types";

const network = getNetwork();
const id = 20;

const run: HardhatScript = async () => {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const Randomizer = new Randomizer__factory(deployer);
  const randomizer = await Randomizer.deploy();
  await randomizer.deployed();
  console.log("<Randomizer> Contract deployed at:", randomizer.address);

  return {
    deployedContract: {
      contractName: "Randomizer",
      address: randomizer.address,
    },
  };
};

main(network, id, run)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
