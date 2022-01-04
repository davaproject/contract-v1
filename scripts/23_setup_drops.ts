import { ethers } from "hardhat";
import { HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import { Drops__factory } from "../types";
import { getDeployed } from "./utils/deploy-log";

const network = getNetwork();
const id = 23;

const run: HardhatScript = async () => {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const dropsAddress = getDeployed(network, "Drops");
  if (!dropsAddress) {
    throw Error(`${dropsAddress} is not deployed yet`);
  }

  const Drops = new Drops__factory(deployer);
  const drops = Drops.attach(dropsAddress);

  await drops.setSchedule(1640314800, 1640919600);

  return {};
};

main(network, id, run)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
