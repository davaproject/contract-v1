import { ethers } from "hardhat";
import { HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import { RandomBox__factory } from "../types";
import { getDeployed } from "./utils/deploy-log";
import data from "../data.json";
import BytesLikeArray from "./types/BytesLikeArray";

const network = getNetwork();
const id = 17;

const run: HardhatScript = async () => {
  const [deployer] = await ethers.getSigners();
  console.log("Interacting contracts with the account:", deployer.address);

  console.log("Registering parts allocation data");
  const randomBoxAddress = getDeployed(network, "RandomBox");
  if (!randomBoxAddress) {
    throw Error(`${randomBoxAddress} is not deployed yet`);
  }
  const RandomBox = new RandomBox__factory(deployer);
  const randomBox = RandomBox.attach(randomBoxAddress);

  const txA = await randomBox.setA(data.random.aPartIds as BytesLikeArray);
  await txA.wait(1);

  const txB = await randomBox.setB(data.random.bPartIds as BytesLikeArray);
  await txB.wait(1);

  const txC = await randomBox.setC(data.random.cPartIds as BytesLikeArray);
  await txC.wait(1);

  return {};
};

main(network, id, run)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
