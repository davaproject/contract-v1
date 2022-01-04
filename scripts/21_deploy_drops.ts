import { ethers } from "hardhat";
import { HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import { Drops__factory } from "../types";
import { getDeployed } from "./utils/deploy-log";

const network = getNetwork();
const id = 21;

const run: HardhatScript = async () => {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const randomizerAddress = getDeployed(network, "Randomizer");
  if (!randomizerAddress) {
    throw Error(`${randomizerAddress} is not deployed yet`);
  }

  const davaOfficialAddress = getDeployed(network, "DavaOfficial");
  if (!davaOfficialAddress) {
    throw Error(`${davaOfficialAddress} is not deployed yet`);
  }

  const Drops = new Drops__factory(deployer);
  const drops = await Drops.deploy(davaOfficialAddress, randomizerAddress);
  await drops.deployed();
  console.log("<Drops> Contract deployed at:", drops.address);

  return {
    deployedContract: {
      contractName: "Drops",
      address: drops.address,
    },
  };
};

main(network, id, run)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
