import { ethers } from "hardhat";
import { DeployedContract, HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import { getDeployed } from "./utils/deploy-log";

const network = getNetwork();
const id = 16;

const run: HardhatScript = async (): Promise<DeployedContract | undefined> => {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const dava = await getDeployed(network, "Dava");
  if (!dava) {
    throw Error("Dava is not deployed yet");
  }

  console.log("Start deploying <Sale>");
  const Sale = await ethers.getContractFactory("contracts/Sale.sol/Sale");
  const sale = await Sale.deploy(dava);
  await sale.deployed();
  console.log("<Sale> Contract deployed at:", sale.address);

  return {
    contractName: "Sale",
    address: sale.address,
  };
};

main(network, id, run)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
