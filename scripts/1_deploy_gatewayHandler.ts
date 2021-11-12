import { ethers } from "hardhat";
import { HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import { GatewayHandler__factory } from "../types";

const network = getNetwork();
const id = 1;

const run: HardhatScript = async () => {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Start deploying <GatewayHandler>");
  const GatewayHandlerContract = new GatewayHandler__factory(deployer);
  const gatewayHandler = await GatewayHandlerContract.deploy();
  await gatewayHandler.deployed();
  console.log("<GatewayHandler> Contract deployed at:", gatewayHandler.address);

  return {
    deployedContract: {
      contractName: "GatewayHandler",
      address: gatewayHandler.address,
    },
  };
};

main(network, id, run)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
