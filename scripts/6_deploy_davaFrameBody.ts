import { ethers } from "hardhat";
import { DeployedContract, HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import data from "./data.json";
import { DavaFrameBody__factory } from "../types";

const network = getNetwork();
const id = 6;

const run: HardhatScript = async (): Promise<DeployedContract | undefined> => {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Start deploying <DavaFrameBody>");
  const DavaFrameBody = new DavaFrameBody__factory(deployer);
  const davaFrameBody = await DavaFrameBody.deploy(
    data.images.default.frameBody
  );
  await davaFrameBody.deployed();
  console.log("<DavaFrameBody> Contract deployed at:", davaFrameBody.address);

  return {
    contractName: "DavaFrameBody",
    address: davaFrameBody.address,
  };
};

main(network, id, run)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
