import { ethers } from "hardhat";
import { HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import { Randomizer__factory } from "../types";
import { getDeployed } from "./utils/deploy-log";

const network = getNetwork();
const id = 22;

const run: HardhatScript = async () => {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const randomizerAddress = getDeployed(network, "Randomizer");
  if (!randomizerAddress) {
    throw Error(`${randomizerAddress} is not deployed yet`);
  }

  const indexList = ""; // TODO: use real data
  const Randomizer = new Randomizer__factory(deployer);
  const randomizer = Randomizer.attach(randomizerAddress);

  await randomizer.setData(indexList);

  return {
    data: { indexList },
  };
};

main(network, id, run)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
