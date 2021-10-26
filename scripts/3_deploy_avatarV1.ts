import { ethers } from "hardhat";
import { DeployedContract, HardhatScript, main } from "./utils/script-runner";
import { getNetwork } from "./utils/network";
import { AvatarV1__factory } from "../types";

const network = getNetwork();
const id = 3;

const run: HardhatScript = async (): Promise<DeployedContract | undefined> => {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Start deploying <AvatarV1>");
  const AvatarV1Contract = new AvatarV1__factory(deployer);
  const avatarV1 = await AvatarV1Contract.deploy();
  await avatarV1.deployed();
  console.log("<AvatarV1> Contract deployed at:", avatarV1.address);

  return {
    contractName: "AvatarV1",
    address: avatarV1.address,
  };
};

main(network, id, run)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
