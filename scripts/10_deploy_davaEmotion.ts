import { ethers } from "hardhat";
import { DeployedContract, HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import data from "./data.json";

const network = getNetwork();
const id = 10;

const run: HardhatScript = async (): Promise<DeployedContract | undefined> => {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Start deploying <DavaEmotion>");
  const DavaEmotion = await ethers.getContractFactory(
    "contracts/assets/DavaEmotion.sol/DavaEmotion"
  );
  const davaEmotion = await DavaEmotion.deploy(
    data.images.default.emptyHeadBodyBackground,
    ""
  );
  await davaEmotion.deployed();
  console.log("<DavaEmotion> Contract deployed at:", davaEmotion.address);

  return {
    contractName: "DavaEmotion",
    address: davaEmotion.address,
  };
};

main(network, id, run)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
