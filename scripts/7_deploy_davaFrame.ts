import { ethers } from "hardhat";
import { HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import { DavaFrame__factory } from "../types";
import { getDeployed } from "./utils/deploy-log";

const network = getNetwork();
const id = 7;

const run: HardhatScript = async () => {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const gatewayHandler = getDeployed(network, "GatewayHandler");
  if (!gatewayHandler) {
    throw Error("GatewayHandler is not deployed yet");
  }

  console.log("Start deploying <DavaFrame>");
  const DavaFrame = new DavaFrame__factory(deployer);
  const davaFrame = await DavaFrame.deploy(gatewayHandler);
  await davaFrame.deployed();
  console.log("<DavaFrame> Contract deployed at:", davaFrame.address);

  return {
    deployedContract: {
      contractName: "DavaFrame",
      address: davaFrame.address,
    },
  };
};

main(network, id, run)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
