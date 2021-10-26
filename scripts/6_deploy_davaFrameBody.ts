import { ethers } from "hardhat";
import { DeployedContract, HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import data from "./data.json";

const network = getNetwork();
const id = 6;

const run: HardhatScript = async (): Promise<DeployedContract | undefined> => {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Start deploying <DavaFrameBody>");
  const DavaFrameBody = await ethers.getContractFactory(
    "contracts/assets/DavaFrameBody.sol/DavaFrameBody"
  );
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
