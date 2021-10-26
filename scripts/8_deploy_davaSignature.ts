import { ethers } from "hardhat";
import { DeployedContract, HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import data from "./data.json";

const network = getNetwork();
const id = 8;

const run: HardhatScript = async (): Promise<DeployedContract | undefined> => {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Start deploying <DavaSignature>");
  const DavaSignature = await ethers.getContractFactory(
    "contracts/assets/DavaSignature.sol/DavaSignature"
  );
  const davaSignature = await DavaSignature.deploy(
    data.images.default.signature
  );
  await davaSignature.deployed();
  console.log("<DavaSignature> Contract deployed at:", davaSignature.address);

  return {
    contractName: "DavaSignature",
    address: davaSignature.address,
  };
};

main(network, id, run)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
