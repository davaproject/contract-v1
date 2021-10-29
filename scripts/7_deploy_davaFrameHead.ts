import { ethers } from "hardhat";
import { HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import data from "./data.json";
import { DavaFrameHead__factory } from "../types";

const network = getNetwork();
const id = 7;

const run: HardhatScript = async () => {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Start deploying <DavaFrameHead>");
  const DavaFrameHead = new DavaFrameHead__factory(deployer);
  const davaFrameHead = await DavaFrameHead.deploy(
    data.images.frames.frameHead
  );
  await davaFrameHead.deployed();
  console.log("<DavaFrameHead> Contract deployed at:", davaFrameHead.address);

  return {
    deployedContract: {
      contractName: "DavaFrameHead",
      address: davaFrameHead.address,
    },
  };
};

main(network, id, run)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
