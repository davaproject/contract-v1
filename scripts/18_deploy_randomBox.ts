import { ethers } from "hardhat";
import { DeployedContract, HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";

const network = getNetwork();
const id = 18;

const run: HardhatScript = async (): Promise<DeployedContract | undefined> => {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Start deploying <RandomBox>");
  const RandomBox = await ethers.getContractFactory(
    "contracts/RandomBox.sol/RandomBox"
  );
  const randomBox = await RandomBox.deploy();
  await randomBox.deployed();
  console.log("<RandomBox> Contract deployed at:", randomBox.address);

  return {
    contractName: "RandomBox",
    address: randomBox.address,
  };
};

main(network, id, run)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
