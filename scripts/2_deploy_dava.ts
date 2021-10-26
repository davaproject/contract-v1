import { ethers } from "hardhat";
import { DeployedContract, HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import { getDeployed } from "./utils/deploy-log";

const network = getNetwork();
const id = 2;

const run: HardhatScript = async (): Promise<DeployedContract | undefined> => {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const minimalProxy = getDeployed(network, "MinimalProxy");
  if (!minimalProxy) {
    throw Error("MinimalProxy is not deployed yet");
  }

  console.log("Start deploying <Dava>");
  const DavaContract = await ethers.getContractFactory(
    "contracts/Dava.sol/Dava"
  );
  const dava = await DavaContract.deploy(minimalProxy);
  await dava.deployed();
  console.log("<Dava> Contract deployed at:", dava.address);

  return {
    contractName: "Dava",
    address: dava.address,
  };
};

main(network, id, run)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
