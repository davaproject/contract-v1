import { ethers } from "hardhat";
import { HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import { getDeployed } from "./utils/deploy-log";
import { Dava__factory } from "../types";

const network = getNetwork();
const id = 12;

const run: HardhatScript = async () => {
  const [deployer] = await ethers.getSigners();
  console.log("Interacting contracts with the account:", deployer.address);

  const davaAddress = getDeployed(network, "Dava");
  if (!davaAddress) {
    throw Error(`${davaAddress} is not deployed yet`);
  }
  const Dava = new Dava__factory(deployer);
  const dava = Dava.attach(davaAddress);

  const davaFrame = getDeployed(network, "DavaFrame");
  if (!davaFrame) {
    throw Error(`${davaFrame} is not deployed yet`);
  }
  const tx1 = await dava.registerFrameCollection(davaFrame);
  await tx1.wait(1);

  const davaOfficial = getDeployed(network, "DavaOfficial");
  if (!davaOfficial) {
    throw Error(`${davaOfficial} is not deployed yet`);
  }

  const tx2 = await dava.registerCollection(davaOfficial);
  await tx2.wait(1);

  return {};
};

main(network, id, run)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
