import { ethers } from "hardhat";
import { DeployedContract, HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import { getDeployed } from "./utils/deploy-log";
import { Sale__factory } from "../types";

const network = getNetwork();
const id = 16;

const run: HardhatScript = async (): Promise<DeployedContract | undefined> => {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const dava = getDeployed(network, "Dava");
  if (!dava) {
    throw Error("Dava is not deployed yet");
  }

  console.log("Start deploying <Sale>");
  const Sale = new Sale__factory(deployer);
  const sale = await Sale.deploy(
    dava,
    1635292800,
    1635379200,
    1635552000
  );
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
