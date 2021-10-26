import { ethers } from "hardhat";
import { DeployedContract, HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import data from "./data.json";

const network = getNetwork();
const id = 5;

const run: HardhatScript = async (): Promise<DeployedContract | undefined> => {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Start deploying <DavaFrameBackground>");
  const DavaFrameBackground = await ethers.getContractFactory(
    "contracts/assets/DavaFrameBackground.sol/DavaFrameBackground"
  );
  const davaFrameBackground = await DavaFrameBackground.deploy(
    data.images.default.frameBackground
  );
  await davaFrameBackground.deployed();
  console.log(
    "<DavaFrameBackground> Contract deployed at:",
    davaFrameBackground.address
  );

  return {
    contractName: "DavaFrameBackground",
    address: davaFrameBackground.address,
  };
};

main(network, id, run)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
