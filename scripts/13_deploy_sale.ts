import { ethers } from "hardhat";
import { HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import data from "../data.json";
import { Sale__factory } from "../types";
import { getDeployed } from "./utils/deploy-log";

const network = getNetwork();
const id = 13;

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

  console.log("Start deploying <Sale>");
  const Sale = new Sale__factory(deployer);
  const sale = await Sale.deploy(
    dava,
    davaOfficial,
    randomBox,
    data.sale[network].presaleStartsAt,
    data.sale[network].presaleEndsAt,
    data.sale[network].mainsaleStartsAt
  );
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
