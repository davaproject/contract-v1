import { ethers } from "hardhat";
import { HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import { GatewayHandler__factory } from "../types";
import { getDeployed } from "./utils/deploy-log";
import data from "../data.json";

const network = getNetwork();
const id = 2;

const run: HardhatScript = async () => {
  const [deployer] = await ethers.getSigners();
  console.log("interacting contracts with the account:", deployer.address);

  const gatewayHandlerAddress = getDeployed(network, "GatewayHandler");
  if (!gatewayHandlerAddress) {
    throw new Error("GatewayHandler is not deployed yet");
  }
  const GatewayHandlerContract = new GatewayHandler__factory(deployer);
  const gatewayHandler = GatewayHandlerContract.attach(gatewayHandlerAddress);

  console.log("Start registering gateway to <GatewayHandler>");
  await Object.values(data.gatewayHandler).reduce(
    (acc, { key, gateway }) =>
      acc.then(async () => {
        const tx = await gatewayHandler.setGateway(key, gateway);
        await tx.wait(1);
      }),
    Promise.resolve()
  );
  console.log("gateways are registered in <GatewayHandler>");

  return {};
};

main(network, id, run)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
