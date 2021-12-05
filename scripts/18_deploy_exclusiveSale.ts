import { ethers } from "hardhat";
import { HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import { ExclusiveSale__factory } from "../types";
import { getDeployed } from "./utils/deploy-log";

const network = getNetwork();
const id = 18;

const run: HardhatScript = async () => {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const dava = getDeployed(network, "Dava");
  if (!dava) {
    throw Error("Dava is not deployed yet");
  }

  const davaOfficial = getDeployed(network, "DavaOfficial");
  if (!davaOfficial) {
    throw Error("DavaOfficial is not deployed yet");
  }

  const randomBox = getDeployed(network, "RandomBox");
  if (!randomBox) {
    throw Error("RandomBox is not deployed yet");
  }

  console.log("Start deploying <ExclusiveSale>");
  const Sale = new ExclusiveSale__factory(deployer);
  const sale = await Sale.deploy(dava, davaOfficial, randomBox);
  await sale.deployed();
  console.log("<ExclusiveSale> Contract deployed at:", sale.address);

  return {
    deployedContract: {
      contractName: "ExclusiveSale",
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
