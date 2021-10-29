import { ethers } from "hardhat";
import { DeployedContract, HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import { getDeployed } from "./utils/deploy-log";
import { Contract } from "@ethersproject/contracts";
import {
  AvatarV1__factory,
  DavaSuit__factory,
  Dava__factory,
  Sale__factory,
} from "../types";
import data from "./data.json";

const network = getNetwork();

const run: HardhatScript = async (): Promise<DeployedContract | undefined> => {
  const [deployer] = await ethers.getSigners();
  console.log("Interacting contracts with the account:", deployer.address);

  const saleAddress = getDeployed(network, "Sale");
  if (!saleAddress) {
    throw Error("<Sale> is not deployed yet");
  }
  const Sale = new Sale__factory(deployer);
  const sale = Sale.attach(saleAddress);

  const recipient = deployer.address;
  const tokenId = 0;
  await sale.claim([{ recipient, tokenId }]);
  console.log("DONE");

  return;
};

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
