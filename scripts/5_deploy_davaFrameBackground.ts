import { ethers } from "hardhat";
import { HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import data from "./data.json";
import { DavaFrameBackground__factory } from "../types";

const network = getNetwork();
const id = 5;

const run: HardhatScript = async () => {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Start deploying <DavaFrameBackground>");
  const DavaFrameBackground = new DavaFrameBackground__factory(deployer);
  const davaFrameBackground = await DavaFrameBackground.deploy(
    data.images.frames.frameBackground
  );
  await davaFrameBackground.deployed();
  console.log(
    "<DavaFrameBackground> Contract deployed at:",
    davaFrameBackground.address
  );

  return {
    deployedContract: {
      contractName: "DavaFrameBackground",
      address: davaFrameBackground.address,
    },
  };
};

main(network, id, run)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
