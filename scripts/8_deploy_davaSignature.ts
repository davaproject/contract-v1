import { ethers } from "hardhat";
import { HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import data from "./data.json";
import { DavaSignature__factory } from "../types";

const network = getNetwork();
const id = 8;

const run: HardhatScript = async () => {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Start deploying <DavaSignature>");
  const DavaSignature = new DavaSignature__factory(deployer);
  const davaSignature = await DavaSignature.deploy(
    data.images.frames.signature
  );
  await davaSignature.deployed();
  console.log("<DavaSignature> Contract deployed at:", davaSignature.address);

  return {
    deployedContract: {
      contractName: "DavaSignature",
      address: davaSignature.address,
    },
  };
};

main(network, id, run)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
