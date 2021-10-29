import { ethers } from "hardhat";
import { DeployedContract, HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import { getDeployed } from "./utils/deploy-log";
import { Sale, Sale__factory } from "../types";

const network = getNetwork();
const id = 14;

const run: HardhatScript = async () => {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const dava = getDeployed(network, "Dava");
  if (!dava) {
    throw Error("Dava is not deployed yet");
  }

  console.log("Start deploying <Sale>");
  const Sale = new Sale__factory(deployer);

  let sale: Sale;
  if (network == "rinkeby") {
    sale = await Sale.deploy(dava, 0, 1635379200, 0);
  } else {
    sale = await Sale.deploy(dava, 0, 1635379200, 0);
  }

  await sale.deployed();
  console.log("<Sale> Contract deployed at:", sale.address);

  return {
    deployedContract: {
      contractName: "Sale",
      address: sale.address,
    },
  };
};

main(network, id, run)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
