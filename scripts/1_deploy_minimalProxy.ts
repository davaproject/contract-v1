import { ethers } from "hardhat";
import { DeployedContract, HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";

const network = getNetwork();
const id = 1;

const run: HardhatScript = async (): Promise<DeployedContract | undefined> => {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Start deploying <MinimalProxy>");
  const MinalProxyContract = await ethers.getContractFactory(
    "contracts/libraries/MinimalProxy.sol/MinimalProxy"
  );
  const minimalProxy = await MinalProxyContract.deploy();
  await minimalProxy.deployed();
  console.log("<MinimalProxy> Contract deployed at:", minimalProxy.address);

  return {
    contractName: "MinimalProxy",
    address: minimalProxy.address,
  };
};

main(network, id, run)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
